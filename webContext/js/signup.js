/**
 * For signup.html
 */
$(function(){
	// 回车键快捷操作
	$("body").keypress(function(e) {
		var keyCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if (keyCode == 13) {
			var g = $("#signupBtn").click();
			return false;
		}
	});
	$("#accountid").focus();//再自动聚焦账户输入框
})

//获取一个新的验证码
function getNewVerCode(){
	$("#showvercode").attr("src","homeController/getNewVerCode.do?s="+(new Date()).getTime());
}

//执行注册过程
function doSignUp(){
	// 还原提示状态
	$("#accountidbox,#accountpwdbox,#repaccountpwdbox").removeClass("has-error");
	$("#alertbox").removeClass("show");
	$("#alertbox").addClass("hidden");
	var accountId = $("#accountid").val();
	var accountPwd = $("#accountpwd").val();
	var repAccountPwd = $("#repaccountpwd").val();
	// 输入非空检查
	if (accountId.length == 0) {
		$("#accountidbox").addClass("has-error");
		$("#accountid").focus();
		return;
	}
	if (accountPwd.length == 0) {
		$("#accountpwdbox").addClass("has-error");
		$("#accountpwd").focus();
		return;
	}
	if (repAccountPwd.length == 0) {
		$("#repaccountpwdbox").addClass("has-error");
		$("#repaccountpwd").focus();
		return;
	}
	// 确认密码检查
	$("#accountid,#accountpwd,#repaccountpwd,#signupBtn,#vercode").attr('disabled', true);
	if (accountPwd+"" != repAccountPwd+"") {
		showAlert("提示：两次输入的新密码不一致，请检查确认");
		$("#accountpwdbox").addClass("has-error");
		$("#repaccountpwdbox").addClass("has-error");
		return;
	}
	// 以加密方式发送修改密码请求
	$.ajax({
		url : 'homeController/getPublicKey.ajax',
		type : 'POST',
		data : {},
		dataType : 'text',
		success : function(result) {
			// 获取公钥
			var signup_publicKeyInfo=eval("("+result+")");
			// 生成JSON对象格式的信息
			var signUpInfo = '{account:"' + accountId + '",pwd:"'
			+ accountPwd + '",time:"' + signup_publicKeyInfo.time + '"}';
			var encrypt = new JSEncrypt();// 加密插件对象
			encrypt.setPublicKey(signup_publicKeyInfo.publicKey);// 设置公钥
			var encrypted = encrypt.encrypt(signUpInfo);// 进行加密
			sendSignUpInfo(encrypted);
		},
		error : function() {
			showAlert("提示：注册失败，请检查网络链接或服务器运行状态");
		}
	});
}

// 将加密数据发送至服务器并显示操作结果
function sendSignUpInfo(encrypted){
	$.ajax({
		type : "POST",
		dataType : "text",
		url : "homeController/doSigUp.ajax",
		data : {
			encrypted : encrypted,
			vercode : $("#vercode").val()
		},
		success : function(result) {
			switch (result) {
			case "success":
				$("#accountidbox,#accountpwdbox,#repaccountpwdbox").removeClass("has-error");
				window.location.href = "/home.html";
				break;
			case "illegal":
				showAlert("提示：注册功能已被禁用，请求被拒绝");
				break;
			case "accountexists":
				showAlert("提示：该账户名已存在，请使用其他账户名进行注册");
				$("#accountidbox").addClass("has-error");
				break;
			case "needvercode":
				$("#accountid,#accountpwd,#repaccountpwd,#signupBtn,#vercode").attr('disabled', false);
				$("#vercodebox").removeClass("hidden");
				$("#vercodebox").addClass("show");
				getNewVerCode();
				break;
			case "invalidaccount":
				showAlert("提示：注册失败，账户名不合法。账户名的长度需为3-32个字符，且仅支持ISO-8859-1中的字符（推荐使用英文字母、英文符号及阿拉伯数字）。");
				$("#accountidbox").addClass("has-error");
				break;
			case "illegalaccount":
				showAlert("提示：注册失败，账户名中不得包含“=”或“:”，且首个字符不能为“#”。");
				$("#accountidbox").addClass("has-error");
				break;
			case "mustlogout":
				showAlert("提示：您已经登入了一个账户，请先注销后再执行本操作");
				break;
			case "invalidpwd":
				showAlert("提示：注册失败，密码格式不正确。密码的长度需为3-32个字符，且仅支持ISO-8859-1中的字符（推荐使用英文字母、英文符号及阿拉伯数字）。");
				$("#accountpwdbox").addClass("has-error");
				$("#repaccountpwdbox").addClass("has-error");
				break;
			case "error":
				showAlert("提示：注册失败，注册请求无法通过加密效验（可能是请求耗时过长导致的）");
				break;
			case "cannotsignup":
				showAlert("提示：注册失败，发生意外错误，请稍后重试或联系管理员");
				break;
			default:
				showAlert("提示：注册失败，发生未知错误");
				break;
			}
		},
		error : function() {
			showAlert("提示：注册失败，请检查网络链接或服务器运行状态");
		}
	});
}

// 显示修改密码错误提示
function showAlert(txt) {
	$("#accountid,#accountpwd,#repaccountpwd,#signupBtn,#vercode").attr('disabled', false);
	$("#alertbox").removeClass("hidden");
	$("#alertbox").addClass("show");
	$("#alertbox").text(txt);
}