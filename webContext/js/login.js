/**
 * login.html
 */

$(function() {
	// 回车键快捷操作
	$("body").keypress(function(e) {
		var keyCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if (keyCode == 13) {
			var g = $("#loginBtn").click();
			return false;
		}
	});
	$("#vercodebox").html("");
	$("#vercodebox").removeClass("show");
	$("#vercodebox").addClass("hidden");
	// 打开页面自动聚焦账户输入框
	$("#accountid").focus();
})

function dologin() {
	var accountId = $("#accountid").val();
	var accountPwd = $("#accountpwd").val();
	var check = "y";
	if (accountId.length == 0) {
		$("#accountidbox").addClass("has-error");
		check = "n"
	} else {
		$("#accountidbox").removeClass("has-error");
	}
	if (accountPwd.length == 0) {
		$("#accountpwdbox").addClass("has-error");
		check = "n"
	} else {
		$("#accountpwdbox").removeClass("has-error");
	}
	if (check == "y") {
		$.ajax({
			type : "POST",
			dataType : "text",
			url : "homeController/getPublicKey.ajax",
			data : {},
			success : function(result) {
				var publicKeyInfo = eval("(" + result + ")");
				var loginInfo = '{accountId:"' + accountId + '",accountPwd:"'
						+ accountPwd + '",time:"' + publicKeyInfo.time + '"}';
				var encrypt = new JSEncrypt();// 加密插件对象
				encrypt.setPublicKey(publicKeyInfo.publicKey);// 设置公钥
				var encrypted = encrypt.encrypt(loginInfo);// 进行加密
				sendLoginInfo(encrypted);
			},
			error : function() {
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录请求失败，请检查网络或服务器运行状态");
			}
		});
	}
}

function sendLoginInfo(encrypted) {
	$.ajax({
		type : "POST",
		dataType : "text",
		url : "homeController/doLogin.ajax",
		data : {
			encrypted : encrypted,
			vercode : $("#vercode").val()
		},
		success : function(result) {
			$("#alertbox").removeClass("alert");
			$("#alertbox").removeClass("alert-danger");
			$("#alertbox").text("");
			$("#vercodebox").html("");
			$("#vercodebox").removeClass("show");
			$("#vercodebox").addClass("hidden");
			switch (result) {
			case "permitlogin":
				$("#accountidbox").removeClass("has-error");
				$("#accountpwdbox").removeClass("has-error");
				window.location.href = "home.html";
				break;
			case "accountnotfound":
				$("#accountidbox").addClass("has-error");
				$("#accountpwdbox").removeClass("has-error");
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录失败，账户不存在或未设置");
				break;
			case "accountpwderror":
				$("#accountpwdbox").addClass("has-error");
				$("#accountidbox").removeClass("has-error");
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录失败，密码错误或未设置");
				break;
			case "needsubmitvercode":
				$("#vercodebox").html("<label id='vercodetitle' class='col-sm-6'><img id='showvercode' class='vercodeimg' alt='点击获取验证码' src='homeController/getNewVerCode.do?s="+(new Date()).getTime()+"' onclick='getNewVerCode()'></label><div class='col-sm-6'><input type='text' class='form-control' id='vercode' placeholder='验证码……'></div>");
				$("#vercodebox").removeClass("hidden");
				$("#vercodebox").addClass("show");
				break;
			case "error":
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录失败，登录请求无法通过效验（可能是请求耗时过长导致的）");
				break;
			default:
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：无法登录，未知错误");
				break;
			}
		},
		error : function() {
			$("#alertbox").addClass("alert");
			$("#alertbox").addClass("alert-danger");
			$("#alertbox").text("提示：登录请求失败，请检查网络或服务器运行状态");
		}
	});
}

//获取一个新的验证码
function getNewVerCode(){
	$("#showvercode").attr("src","homeController/getNewVerCode.do?s="+(new Date()).getTime());
}