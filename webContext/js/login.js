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
	// 询问是否可以显示注册按钮
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {},
		url : "homeController/askForAllowSignUpOrNot.ajax",
		success : function(result) {
			if (result == "true") {
				$("#signupBox").removeClass("hidden");
				$("#signupBox").addClass("show");
				return;
			}
		},
		error : function() {
			alert("错误：无法连接到kiftd服务器，请检查您的网络连接或查看服务器运行状态。");
		}
	});
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
		startLogin();
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
				showAlert("提示：登录请求失败，请检查网络或服务器运行状态");
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
				finishLogin();
				$("#accountidbox").removeClass("has-error");
				$("#accountpwdbox").removeClass("has-error");
				window.location.href = "/home.html";
				break;
			case "accountnotfound":
				$("#accountidbox").addClass("has-error");
				$("#accountpwdbox").removeClass("has-error");
				showAlert("提示：登录失败，账户不存在或未设置");
				break;
			case "accountpwderror":
				$("#accountpwdbox").addClass("has-error");
				$("#accountidbox").removeClass("has-error");
				showAlert("提示：登录失败，密码错误或未设置");
				break;
			case "needsubmitvercode":
				finishLogin();
				$("#vercodebox").html("<label id='vercodetitle' class='col-sm-6'><img id='showvercode' class='vercodeimg' alt='点击获取验证码' src='homeController/getNewVerCode.do?s="+(new Date()).getTime()+"' onclick='getNewVerCode()'></label><div class='col-sm-6'><input type='text' class='form-control' id='vercode' placeholder='验证码……'></div>");
				$("#vercodebox").removeClass("hidden");
				$("#vercodebox").addClass("show");
				break;
			case "error":
				showAlert("提示：登录失败，登录请求无法通过效验（可能是请求耗时过长导致的）");
				break;
			default:
				showAlert("提示：无法登录，未知错误");
				break;
			}
		},
		error : function() {
			showAlert("提示：登录请求失败，请检查网络或服务器运行状态");
		}
	});
}

//获取一个新的验证码
function getNewVerCode(){
	$("#showvercode").attr("src","homeController/getNewVerCode.do?s="+(new Date()).getTime());
}

function showAlert(text){
	finishLogin();
	$("#alertbox").addClass("alert");
	$("#alertbox").addClass("alert-danger");
	$("#alertbox").text(text);
}

function startLogin(){
	$("#loginBtn").attr('disabled','disabled');
	$("#accountid").attr('disabled','disabled');
	$("#accountpwd").attr('disabled','disabled');
	$("#vercode").attr('disabled','disabled');
	$("#loginBtn").val('正在登录...');
}

function finishLogin(){
	$("#loginBtn").removeAttr('disabled');
	$("#accountid").removeAttr('disabled');
	$("#accountpwd").removeAttr('disabled');
	$("#vercode").removeAttr('disabled');
	$("#loginBtn").val('登录');
}