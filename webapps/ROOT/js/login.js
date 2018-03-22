/**
 * login.jsp
 */

function dologin() {
	var accountid = $("#accountid").val();
	var accountpwd = $("#accountpwd").val();
	var check = "y";
	if (accountid.length == 0) {
		$("#accountidbox").addClass("has-error");
		check = "n"
	} else {
		$("#accountidbox").removeClass("has-error");
	}
	if (accountpwd.length == 0) {
		$("#accountpwdbox").addClass("has-error");
		check = "n"
	} else {
		$("#accountpwdbox").removeClass("has-error");
	}
	if (check == "y") {
		$.ajax({
			type : "POST",
			dataType : "text",
			url : "homeController/doLogin.ajax",
			data : {
				accountid : accountid,
				accountpwd : accountpwd
			},
			success : function(result) {
				$("#alertbox").removeClass("alert");
				$("#alertbox").removeClass("alert-danger");
				$("#alertbox").text("");
				if (result == "permitlogin") {
					$("#accountidbox").removeClass("has-error");
					$("#accountpwdbox").removeClass("has-error");
					window.location.href = "home.jsp";
				} else if (result == "accountnotfound") {
					$("#accountidbox").addClass("has-error");
					$("#accountpwdbox").removeClass("has-error");
					$("#alertbox").addClass("alert");
					$("#alertbox").addClass("alert-danger");
					$("#alertbox").text("提示：登录失败，账户不存在或未设置");
				} else if (result == "accountpwderror") {
					$("#accountpwdbox").addClass("has-error");
					$("#accountidbox").removeClass("has-error");
					$("#alertbox").addClass("alert");
					$("#alertbox").addClass("alert-danger");
					$("#alertbox").text("提示：登录失败，密码错误或未设置");
				} else {
					$("#alertbox").addClass("alert");
					$("#alertbox").addClass("alert-danger");
					$("#alertbox").text("提示：无法登录，未知错误");
				}
			},
			error : function() {
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录请求失败，请检查网络或服务器运行状态");
			}
		});
	}
}