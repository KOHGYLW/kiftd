/**
 * home.js kiftd主页面操作定义 by 青阳龙野 该文件为home.html的操作定义文件，包含了kiftd页面上的主要操作实现。
 */

var locationpath = "root";// 记录当前文件路径
var parentpath = "null";// 记录当前文件路径的父级目录
var ap;// 音乐播放器对象
var zipTimer;// 打包下载计时器
var folderView;// 返回的文件系统视图对象
var originFolderView;// 保存原始的文件视图对象
var fs;// 选中的要上传的文件列表
var checkedMovefiles;// 移动文件的存储列表
var constraintLevel;// 当前文件夹限制等级
var account;// 用户账户
var isUpLoading=false;// 是否正在执行其他上传操作

// 页面初始化
$(function() {
	getServerOS();// 得到服务器操作系统信息
	showFolderView("root");// 显示根节点页面视图
	// 点击空白处取消选中文件并重新加载文件视图（不支持火狐）
	$(document).click(function(e) {
		var filetable = $("#filetable")[0];
		if (e.target !== filetable && !$.contains(filetable, e.target)) {
			$(".filerow").removeClass("info");
		}
	});
	// 关闭音乐播放模态框自动停止播放并将进度归0
	$('#audioPlayerModal').on('hidden.bs.modal', function(e) {
		if (ap != null) {
			ap.seek(0);
			ap.pause();
		}
	});
	// 关闭打包下载模态框自动停止计时
	$('#downloadAllCheckedModal').on('hidden.bs.modal', function(e) {
		if(zipTimer!=null){
			window.clearInterval(zipTimer);
		}
	});
	// 关闭登陆模态框自动清空输入数据
	$('#loginModal').on('hidden.bs.modal', function(e) {
		$("#accountid").val('');
		$("#accountpwd").val('');
	});
	// 各个模态框的回车响应功能。该功能仅对“首选”的按钮有效，对其他按钮无效，以避免用户误操作。
	$('.modal').on('shown.bs.modal', function(e) {
		$(this).addClass("shown");
	});
	$('.modal').on('hidden.bs.modal', function(e) {
		$(this).removeClass("shown");
	});
	$("body").keypress(function(e) {
		var keyCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if(keyCode == 13) {
			var g=$(".shown .btn-primary");
			if(g.get(0)!=null){
				g.click();
			}else{
				doSearchFile();
			}
			return false;
		}
	});
	// 开启登陆模态框自动聚焦账户输入框
	$('#loginModal').on('shown.bs.modal', function(e) {
		$("#accountid").focus();
	});
	// 开启新建文件夹框自动初始化状态
	$('#newFolderModal').on('show.bs.modal', function(e) {
		$("#folderalert").removeClass("alert");
		$("#folderalert").removeClass("alert-danger");
		$("#foldernamebox").removeClass("has-error");
		$("#foldername").val("");
		$("#foldertypelist").html("");
		if(account!=null){
			$("#foldername").attr("folderConstraintLevel",constraintLevel+"");
			$("#newfoldertype").text(folderTypes[constraintLevel]);
			for(var i=constraintLevel;i<folderTypes.length;i++){
				$("#foldertypelist").append("<li><a onclick='changeNewFolderType("+i+")'>"+folderTypes[i]+"</a></li>");
			}
		}else{
			$("#foldertypelist").append("<li><a onclick='changeNewFolderType(0)'>"+folderTypes[0]+"</a></li>");
		}
	});
	// 开启新建文件夹模态框自动聚焦文件名输入框
	$('#newFolderModal').on('shown.bs.modal', function(e) {
		$("#foldername").focus();
	});
	// 开启编辑文件夹框自动初始化状态
	$('#renameFolderModal').on('show.bs.modal', function(e) {
		$("#newfolderalert").removeClass("alert");
		$("#newfolderalert").removeClass("alert-danger");
		$("#folderrenamebox").removeClass("has-error");
		$("#newfolderalert").text("");
		$("#editfoldertypelist").html("");
		if(account!=null){
			for(var i=constraintLevel;i<folderTypes.length;i++){
				$("#editfoldertypelist").append("<li><a onclick='changeEditFolderType("+i+")'>"+folderTypes[i]+"</a></li>");
			}
		}else{
			$("#editfoldertypelist").append("<li><a onclick='changeEditFolderType(0)'>"+folderTypes[0]+"</a></li>");
		}
	});
	// 响应拖动上传文件
	document.ondragover = function(e) {
		if(e.preventDefault){
			e.preventDefault();
			e.stopPropagation();
		}else{
			window.event.cancelBubble=true;
			window.event.returnValue=false;
		}
	}
	document.ondrop = function(e) {
		if(e.preventDefault){
			e.preventDefault();
			e.stopPropagation();
		}else{
			window.event.cancelBubble=true;
			window.event.returnValue=false;
		}
		if (folderView.authList != null) {
			if (checkAuth(folderView.authList, "U")) {// 如果有上传权限且未进行其他上传
				if(isUpLoading){
					alert("提示：您正在执行另一项上传任务，请在上传窗口关闭后再试。");
				}else{
					if (!(window.ActiveXObject||"ActiveXObject" in window)){// 判断是否为IE
						var dt;
						if(e.dataTransfer != null){
							dt = e.dataTransfer; // 获取到拖入上传的文件对象
						}else{
							dt = window.event.dataTransfer;
						}
						var testFile=true;
						if(dt.items!==undefined){
							for(var i=0;i<dt.items.length;i++){
								var item = dt.items[i];
								if(item.kind === "file" && item.webkitGetAsEntry().isFile) {
									
								}else{
									testFile=false;
								}
							}
						}else{
							for(var i = 0; i < dt.files.length; i++){
					            var dropFile = df.files[i];
					            if ( dropFile.type ) {
					               
					            } else {
					                try {
					                    var fileReader = new FileReader();
					                    fileReader.readAsDataURL(dropFile.slice(0, 10));
					                    fileReader.addEventListener('load', function (e) {
					                        
					                    }, false);
					                    fileReader.addEventListener('error', function (e) {
					                    		testFile=false;
					                    }, false);
					                } catch (e) {
					                		testFile=false;
					                }
					            }
					        }
						}
						if(testFile){
							fs = e.dataTransfer.files; // 获取到拖入上传的文件对象
							showfilepath();
							showUploadFileModel();
							checkUploadFile();
						}else{
							alert("提示：您拖入的文件中包含了一个或多个文件夹，无法进行上传。");
						}
					}else{
						alert("提示：IE浏览器不支持拖拽上传。您可以使用现代浏览器或将浏览模式切换为“极速模式”来体验该功能。");
					}
				}
			}else{
				alert("提示：您不具备上传权限，无法上传文件。");
			}
		}else{
			alert("提示：您不具备上传权限，无法上传文件。");
		}
	}
	// Shift+A全选文件/反选文件
	$(document).keypress(function (e) {
		var keyCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if (keyCode == 65){
			if (window.event.shiftKey) {
				checkallfile();
			}
		}
	});
	// 关闭移动提示框自动取消移动
	$('#moveFilesModal').on('hidden.bs.modal', function(e) {
		checkedMovefiles=undefined;
		$("#cutSignTx").text("剪切");
		$("#cutSignTx").removeClass("cuted");
		$('#moveFilesBox').html("");
	});
	// IE内核浏览器内的startsWith方法的自实现
	if(typeof String.prototype.startsWith != 'function') {
		String.prototype.startsWith = function(prefix) {
			return this.slice(0, prefix.length) === prefix;
		};
	}
	if(typeof String.prototype.endsWith != 'function') {
		String.prototype.endsWith = function(suffix) {
			return this.indexOf(suffix, this.length - suffix.length) !== -1;
		};
	}
	// 开启详细信息模态框自动显示信息内容
	$('#folderInfoModal').on('show.bs.modal', function(e) {
		var f=folderView.folder;
		$("#fim_name").text(f.folderName);
		$("#fim_creator").text(f.folderCreator);
		$("#fim_folderCreationDate").text(f.folderCreationDate);
		$("#fim_statistics").text("共包含 "+folderView.folderList.length+" 个文件夹， "+folderView.fileList.length+" 个文件。");
	});
});

// 全局请求失败提示
function doAlert(){
	alert("错误：无法连接到kiftd服务器，请检查您的网络连接或查看服务器运行状态。");
}

// 获取服务器操作系统
function getServerOS() {
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {

		},
		url : "homeController/getServerOS.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "login.html";
			}
			$("#serverOS").text(result);
		},
		error : function() {
			$("#serverOS").html("<a onclick='getServerOS()'>获取失败，点击重试</a>");
		}
	});
}

// 获取实时文件夹视图
function showFolderView(fid) {
	startLoading();
	$.ajax({
		type : 'POST',
		dataType : 'text',
		data : {
			fid : fid
		},
		url : 'homeController/getFolderView.ajax',
		success : function(result) {
			endLoading();
			if (result == "mustLogin") {
				window.location.href = "login.html";
			}else if(result == "notAccess"){
				window.location.href="/";
			} else {
				folderView = eval("(" + result + ")");
				locationpath = folderView.folder.folderId;
				parentpath = folderView.folder.folderParent;
				constraintLevel=folderView.folder.folderConstraint;
				screenedFoldrView=null;
				$("#sreachKeyWordIn").val("");
				showParentList(folderView);
				showAccountView(folderView);
				showPublishTime(folderView);
				originFolderView=$.extend(true, {}, folderView);
				$("#sortByFN").removeClass();
				$("#sortByCD").removeClass();
				$("#sortByFS").removeClass();
				$("#sortByCN").removeClass();
				showFolderTable(folderView);
			}
		},
		error : function() {
			endLoading();
			doAlert();
			$("#tb").html("<span class='graytext'>获取失败，请尝试刷新</span>");
			$("#publishTime").html("<span class='graytext'>获取失败，请尝试刷新</span>");
			$("#parentlistbox")
					.html("<span class='graytext'>获取失败，请尝试刷新</span>");
		}
	});
}

// 开始文件视图加载动画
function startLoading(){
	$('#loadingModal').modal({backdrop:'static', keyboard: false}); 
	$('#loadingModal').modal('show');
}

// 结束文件视图加载动画
function endLoading(){
	$('#loadingModal').modal('hide');
}

// 开始登陆加载动画
function startLogin(){
	$("#accountid").attr('disabled','disabled');
	$("#accountpwd").attr('disabled','disabled');
	$("#dologinButton").attr('disabled','disabled');
}

// 结束登陆加载动画
function finishLogin(){
	$("#accountid").removeAttr('disabled','disabled');
	$("#accountpwd").removeAttr('disabled','disabled');
	$("#dologinButton").removeAttr('disabled','disabled');
}

// 登录操作
function dologin() {
	var accountId = $("#accountid").val();
	var accountPwd = $("#accountpwd").val();
	var check = "y";
	if (accountId.length == 0) {
		$("#accountidbox").addClass("has-error");
		check = "n";
	} else {
		$("#accountidbox").removeClass("has-error");
	}
	if (accountPwd.length == 0) {
		$("#accountpwdbox").addClass("has-error");
		check = "n";
	} else {
		$("#accountpwdbox").removeClass("has-error");
	}
	if (check == "y") {
		startLogin();
		// 加密认证-获取公钥并将请求加密发送给服务器，避免中途被窃取
		$.ajax({
			url : 'homeController/getPublicKey.ajax',
			type : 'POST',
			data : {},
			dataType : 'text',
			success : function(result) {
				var publicKeyInfo=eval("("+result+")");
				var date = new Date();// 这个是客户浏览器上的当前时间
				var loginInfo = '{accountId:"' + accountId + '",accountPwd:"'
						+ accountPwd + '",time:"' + publicKeyInfo.time + '"}';
				var encrypt = new JSEncrypt();// 加密插件对象
				encrypt.setPublicKey(publicKeyInfo.publicKey);// 设置公钥
				var encrypted = encrypt.encrypt(loginInfo);// 进行加密
				sendLoginInfo(encrypted);
			},
			error : function() {
				finishLogin();
				$("#alertbox").addClass("alert");
				$("#alertbox").addClass("alert-danger");
				$("#alertbox").text("提示：登录请求失败，请检查网络或服务器运行状态");
			}
		});
	}
}

// 发送加密文本
function sendLoginInfo(encrypted) {
	$.ajax({
		type : "POST",
		dataType : "text",
		url : "homeController/doLogin.ajax",
		data : {
			encrypted : encrypted
		},
		success : function(result) {
			finishLogin();
			$("#alertbox").removeClass("alert");
			$("#alertbox").removeClass("alert-danger");
			$("#alertbox").text("");
			switch (result) {
			case "permitlogin":
				$("#accountidbox").removeClass("has-error");
				$("#accountpwdbox").removeClass("has-error");
				$('#loginModal').modal('hide');
				showFolderView(locationpath);
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
			finishLogin();
			$("#alertbox").addClass("alert");
			$("#alertbox").addClass("alert-danger");
			$("#alertbox").text("提示：登录请求失败，请检查网络或服务器运行状态");
		}
	});
}

// 注销操作
function dologout() {
	$('#logoutModal').modal('hide');
	$.ajax({
		url:'homeController/doLogout.ajax',
		type:'POST',
		data:{},
		dataType:'text',
		success:function(result){
			if(result=="SUCCESS"){
				showFolderView(locationpath);
			}
		},
		error:function(){
			doAlert();
		}
	});
}

// 显示当前文件夹的父级路径
function showParentList(folderView) {
	$("#parentFolderList").html("");
	var f = folderView.folder;
	if(folderView.parentList.length>0){
		$.each(folderView.parentList, function(n, val) {
			$("#parentFolderList").append("<li><a href='javascript:void(0);' onclick='entryFolder("+'"' + val.folderId +'"'+")'>"+val.folderName+"</a></li>");
		});
	}else{
		$("#parentFolderList").html("<li class='disabled'><a>无</a></li>");
	}
	if(f.folderName.length>6){
		$("#currentFolderName").text(f.folderName.substr(0,6)+"...");
	}else{
		$("#currentFolderName").text(f.folderName);
	}
	if(f.folderName=="ROOT"){
		$("#folderIconSpan").removeClass("glyphicon-folder-close");
		$("#folderIconSpan").addClass("glyphicon-home");
	}else{
		$("#folderIconSpan").removeClass("glyphicon-home");
		$("#folderIconSpan").addClass("glyphicon-folder-close");
	}
}

// 显示用户视图，包括文件列表、登录信息、操作权限接口等
function showAccountView(folderView) {
	$("#tb").html("");
	account=folderView.account;
	if (folderView.account != null) {
		// 说明已经等陆，显示注销按钮
		$("#tb")
				.append(
						"<button class='btn btn-link rightbtn' data-toggle='modal' data-target='#logoutModal'>注销 ["
								+ folderView.account
								+ "] <span class='glyphicon glyphicon-off' aria-hidden='true'></span></button>");
	} else {
		// 说明用户未登录，显示登录按钮
		$("#tb")
				.append(
						"<button class='btn btn-link rightbtn' data-toggle='modal' data-target='#loginModal'>登入<span class='glyphicon glyphicon-user' aria-hidden='true'></span></button>");
	}
	var authList = folderView.authList;
	// 对操作菜单进行初始化，根据权限显示可操作的按钮（并非约束）。
	$("#fileListDropDown li").addClass("disabled");
	$("#fileListDropDown li a").attr("onclick","");
	$("#fileListDropDown li a").attr("href","javascript:void(0);");
	if (authList != null) {
		if (checkAuth(authList, "C")) {
			$("#createFolderButtonLi").removeClass("disabled");
			$("#createFolderButtonLi a").attr("onclick","showNewFolderModel()");
		}
		if (checkAuth(authList, "U")) {
			$("#uploadFileButtonLi").removeClass("disabled");
			$("#uploadFileButtonLi a").attr("onclick","showUploadFileModel()");
		}
		if (checkAuth(authList, "L")) {
			$("#packageDownloadBox")
					.html(
							"<button class='btn btn-link navbar-btn' onclick='showDownloadAllCheckedModel()'><span class='glyphicon glyphicon-briefcase'></span> 打包下载</button>");
		}else{
			$("#packageDownloadBox").html("");
		}
		if (checkAuth(authList, "D")) {
			$("#deleteSeelectFileButtonLi").removeClass("disabled");
			$("#deleteSeelectFileButtonLi a").attr("onclick","showDeleteAllCheckedModel()");
		}
		if (checkAuth(authList, "M")) {
			$("#cutFileButtonLi").removeClass("disabled");
			$("#cutFileButtonLi a").attr("onclick","startMoveFile()");
			if(checkedMovefiles!==undefined&&checkedMovefiles.length>0){
				$("#cutSignTx").text("粘贴（"+checkedMovefiles.length+"）");
				$("#cutSignTx").addClass("cuted");
			}
		}
	}
}

// 检查权限列表
function checkAuth(authList, auth) {
	var k = false;
	$.each(authList, function(n, a) {
		if (a == auth) {
			k = true;
		}
	});
	return k;
}

// 显示视图更新时间
function showPublishTime(folderView) {
	$("#publishTime").html("");
	var pt = "";
	if (folderView.publishTime != null) {
		pt = folderView.publishTime;
	} else {
		pt = "--";
	}
	$("#publishTime").text(pt);
}

// 刷新文件夹视图
function refreshFolderView() {
	if (locationpath != null && locationpath.length > 0) {
		showFolderView(locationpath);
	} else {
		showFolderView('root');
	}
}

// 返回上一级文件夹
function returnPF() {
	if (parentpath != null && parentpath != "null") {
		showFolderView(parentpath);
	} else {
		showFolderView('root');
	}
}

// 显示文件夹内容
function showFolderTable(folderView) {
	$("#foldertable").html("");
	if (parentpath != null && parentpath != "null") {
		$("#foldertable")
				.append(
						"<tr onclick='returnPF()'><td><button onclick='returnPF()' class='btn btn-link btn-xs'>../</button></td><td>--</td><td>--</td><td>--</td><td>--</td></tr>");
	}
	var authList = folderView.authList;
	var aD = false;
	var aR = false;
	var aL = false;
	if (checkAuth(authList, "D")) {
		aD = true;
	}
	if (checkAuth(authList, "R")) {
		aR = true;
	}
	if (checkAuth(authList, "L")) {
		aL = true;
	}
	$
			.each(
					folderView.folderList,
					function(n, f) {
						var folderRow = "<tr><td><button onclick='entryFolder("
								+ '"' + f.folderId + '"'
								+ ")' class='btn btn-link btn-xs'>/"
								+ f.folderName + "</button></td><td>"
								+ f.folderCreationDate + "</td><td>--</td><td>"
								+ f.folderCreator + "</td><td>";
						if (aD) {
							folderRow = folderRow
									+ "<button onclick='showDeleteFolderModel("
									+ '"'
									+ f.folderId
									+ '","'
									+ f.folderName
									+ '"'
									+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-remove'></span> 删除</button>";
						}
						if (aR) {
							folderRow = folderRow
									+ "<button onclick='showRenameFolderModel("
									+ '"'
									+ f.folderId
									+ '","'
									+ f.folderName
									+ '",'
									+ f.folderConstraint
									+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-wrench'></span> 编辑</button>";
						}
						if (!aR && !aD) {
							folderRow = folderRow + "--";
						}
						folderRow = folderRow + "</td></tr>";
						$("#foldertable").append(folderRow);
					});
	$
			.each(
					folderView.fileList,
					function(n, fi) {
						var fileRow = "<tr onclick='checkfile(" + '"'
								+ fi.fileId + '"' + ")' id='" + fi.fileId
								+ "' class='filerow'><td>" + fi.fileName
								+ "</td><td>" + fi.fileCreationDate
								+ "</td><td>" + fi.fileSize + "MB</td><td>"
								+ fi.fileCreator + "</td><td>";
						if (aL) {
							fileRow = fileRow
									+ "<button onclick='showDownloadModel("
									+ '"'
									+ fi.fileId
									+ '","'
									+ fi.fileName
									+ '"'
									+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-cloud-download'></span> 下载</button>";
							// 对于各种特殊格式文件提供的预览和播放功能
							if (getSuffix(fi.fileName) == "mp4"
									|| getSuffix(fi.fileName) == "webm") {
								fileRow = fileRow
										+ "<button onclick='playVideo("
										+ '"'
										+ fi.fileId
										+ '"'
										+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-play'></span> 播放</button>";
							} else if (getSuffix(fi.fileName) == "pdf") {
								fileRow = fileRow
										+ "<button onclick='pdfView("
										+ '"'
										+ fi.fileId
										+ '"'
										+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-eye-open'></span> 预览</button>";
							} else if (getSuffix(fi.fileName) == "jpg"
									|| getSuffix(fi.fileName) == "jpeg"
									|| getSuffix(fi.fileName) == "gif"
									|| getSuffix(fi.fileName) == "png"
									|| getSuffix(fi.fileName) == "bmp") {
								fileRow = fileRow
										+ "<button onclick='showPicture("
										+ '"'
										+ fi.fileId
										+ '"'
										+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-picture'></span> 查看</button>";
							} else if (getSuffix(fi.fileName) == "mp3"
									|| getSuffix(fi.fileName) == "wav"
									|| getSuffix(fi.fileName) == "ogg") {
								fileRow = fileRow
										+ "<button onclick='playAudio("
										+ '"'
										+ fi.fileId
										+ '"'
										+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-play'></span> 播放</button>";
							}
						}
						if (aD) {
							fileRow = fileRow
									+ "<button onclick='showDeleteFileModel("
									+ '"'
									+ fi.fileId
									+ '","'
									+ fi.fileName
									+ '"'
									+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-remove'></span> 删除</button>";
						}
						if (aR) {
							fileRow = fileRow
									+ "<button onclick='showRenameFileModel("
									+ '"'
									+ fi.fileId
									+ '"'
									+ ","
									+ '"'
									+ fi.fileName
									+ '"'
									+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-wrench'></span> 重命名</button>";
						}
						if (!aR && !aD && !aL) {
							fileRow = fileRow + "--";
						}
						fileRow = fileRow + "</td></tr>";
						$("#foldertable").append(fileRow);
					});
}

var folderTypes=['公开的','仅小组','仅创建者'];// 文件夹约束条件（由小至大）

// 显示新建文件夹模态框
function showNewFolderModel() {
	$('#newFolderModal').modal('show');
}

// 修改新建文件夹约束等级
function changeNewFolderType(type){
	$("#newfoldertype").text(folderTypes[type]);
	$("#foldername").attr("folderConstraintLevel",type+"");
}

// 创建新的文件夹
function createfolder() {
	var fn = $("#foldername").val();
	var fc=$("#foldername").attr("folderConstraintLevel");
	var reg = new RegExp("^[0-9a-zA-Z_\\u4E00-\\u9FFF]+$", "g");
	if (fn.length == 0) {
		showFolderAlert("提示：文件夹名称不能为空。");
	} else if (fn.length > 20) {
		showFolderAlert("提示：文件夹名称太长。");
	} else if (reg.test(fn)) {
		$("#folderalert").removeClass("alert");
		$("#folderalert").removeClass("alert-danger");
		$("#foldernamebox").removeClass("has-error");
		$("#folderalert").text("");
		$.ajax({
			type : "POST",
			dataType : "text",
			data : {
				parentId : locationpath,
				folderName : fn,
				folderConstraint : fc
			},
			url : "homeController/newFolder.ajax",
			success : function(result) {
				if (result == "mustLogin") {
					window.location.href = "login.html";
				} else {
					if (result == "noAuthorized") {
						showFolderAlert("提示：您的操作未被授权，创建文件夹失败");
					} else if (result == "errorParameter") {
						showFolderAlert("提示：参数不正确，创建文件夹失败");
					} else if (result == "cannotCreateFolder") {
						showFolderAlert("提示：出现意外错误，可能未能创建文件夹");
					} else if (result == "folderAlreadyExist") {
						showFolderAlert("提示：该文件夹已经存在，请更换文件夹名称");
					} else if (result == "createFolderSuccess") {
						$('#newFolderModal').modal('hide');
						showFolderView(locationpath);
					} else {
						$('#newFolderModal').modal('hide');
						showFolderView(locationpath);
					}
				}
			},
			error : function() {
				showFolderAlert("提示：出现意外错误，可能未能创建文件夹");
			}
		});
	} else {
		showFolderAlert("提示：文件夹名只能包含英文字母、数组、汉字和下划线。");
	}
}

// 显示新建文件夹状态提示
function showFolderAlert(txt) {
	$("#folderalert").addClass("alert");
	$("#folderalert").addClass("alert-danger");
	$("#foldernamebox").addClass("has-error");
	$("#folderalert").text(txt);
}

// 进入某一文件夹
function entryFolder(folderId) {
	showFolderView(folderId);
}

// 显示删除文件夹模态框
function showDeleteFolderModel(folderId, folderName) {
	$('#deleteFolderBox')
			.html(
					"<button id='dmbutton' type='button' class='btn btn-danger' onclick='deleteFolder("
							+ '"' + folderId + '"' + ")'>删除</button>");
	$("#dmbutton").attr('disabled', false);
	$('#deleteFolderMessage').text(
			"提示：确定要彻底删除文件夹：[" + folderName + "]及其全部内容么？该操作不可恢复");
	$('#deleteFolderModal').modal('toggle');
}

// 执行删除文件夹
function deleteFolder(folderId) {
	$("#dmbutton").attr('disabled', true);
	$('#deleteFolderMessage').text("提示：正在删除，请稍候...");
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {
			folderId : folderId
		},
		url : "homeController/deleteFolder.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFolderMessage').text("提示：您的操作未被授权，删除文件夹失败");
					$("#dmbutton").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#deleteFolderMessage').text("提示：参数不正确，删除文件夹失败");
					$("#dmbutton").attr('disabled', false);
				} else if (result == "cannotDeleteFolder") {
					$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
					$("#dmbutton").attr('disabled', false);
				} else if (result == "deleteFolderSuccess") {
					$('#deleteFolderModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
					$("#dmbutton").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
			$("#dmbutton").attr('disabled', false);
		}
	});
}

// 显示重命名文件夹模态框
function showRenameFolderModel(folderId, folderName, type) {
	$("#renameFolderBox").html(
			"<button type='button' class='btn btn-primary' onclick='renameFolder("
					+ '"' + folderId + '"' + ")'>修改</button>");
	$("#newfoldername").val(folderName);
	changeEditFolderType(type);
	$("#renameFolderModal").modal('show');
}

// 修改编辑文件夹的约束等级
function changeEditFolderType(type){
	$("#editfoldertype").text(folderTypes[type]);
	$("#newfoldername").attr("folderConstraintLevel",type+"");
}

// 执行重命名文件夹
function renameFolder(folderId) {
	var newName = $("#newfoldername").val();
	var fc=$("#newfoldername").attr("folderConstraintLevel");
	var reg = new RegExp("^[0-9a-zA-Z_\\u4E00-\\u9FFF]+$", "g");
	if (newName.length == 0) {
		showRenameFolderAlert("提示：文件夹名称不能为空。");
	} else if (newName.length > 20) {
		showRenameFolderAlert("提示：文件夹名称太长。");
	} else if (reg.test(newName)) {
		$("#newfolderalert").removeClass("alert");
		$("#newfolderalert").removeClass("alert-danger");
		$("#folderrenamebox").removeClass("has-error");
		$("#newfolderalert").text("");
		$.ajax({
			type : "POST",
			dataType : "text",
			data : {
				folderId : folderId,
				newName : newName,
				folderConstraint : fc
			},
			url : "homeController/renameFolder.ajax",
			success : function(result) {
				if (result == "mustLogin") {
					window.location.href = "login.html";
				} else {
					if (result == "noAuthorized") {
						showRenameFolderAlert("提示：您的操作未被授权，编辑失败");
					} else if (result == "errorParameter") {
						showRenameFolderAlert("提示：参数不正确，编辑失败");
					} else if (result == "renameFolderSuccess") {
						$('#renameFolderModal').modal('hide');
						showFolderView(locationpath);
					} else {
						showRenameFolderAlert("提示：出现意外错误，可能未能编辑文件夹");
					}
				}
			},
			error : function() {
				showRenameFolderAlert("提示：出现意外错误，可能未能编辑文件夹");
			}
		});
	} else {
		showRenameFolderAlert("提示：文件夹名只能包含英文字母、数组、汉字和下划线");
	}
}

// 显示重命名文件夹状态提示
function showRenameFolderAlert(txt) {
	$("#newfolderalert").addClass("alert");
	$("#newfolderalert").addClass("alert-danger");
	$("#folderrenamebox").addClass("has-error");
	$("#newfolderalert").text(txt);
}

// 显示上传文件模态框
function showUploadFileModel() {
	$("#uploadFileAlert").removeClass("alert");
	$("#uploadFileAlert").removeClass("alert-danger");
	$("#uploadFileAlert").text("");
	if(isUpLoading==false){
		$("#uploadfile").val("");
		$("#filepath").val("");
		$("#pros").width("0%");
		$("#umbutton").attr('disabled', false);
		$("#filecount").text("");
		$("#uploadstatus").text("");
		$("#selectcount").text("");
	}
	$('#uploadFileModal').modal('show');
}

// 点击文本框触发input:file选择文件动作
function checkpath() {
	$('#uploadfile').click();
}

// 获取选中文件
function getInputUpload(){
	fs = $("#uploadfile").get(0).files;
	showfilepath();
}

// 文件选中后自动回填文件路径
function showfilepath() {
	var filename = "";
	for (var i = 0; i < fs.length; i++) {
		filename = filename + fs[i].name;
		if (i < (fs.length - 1)) {
			filename = filename + "、";
		}
	}
	if (fs.length <= 1) {
		$("#selectcount").text("");
	} else {
		$("#selectcount").text("（共" + fs.length + "个）");
	}
	$("#filepath").val(filename);
}

// 检查是否能够上传
function checkUploadFile() {
	if(isUpLoading==false){
		if(fs!=null&&fs.length>0){
			isUpLoading=true;
			$("#umbutton").attr('disabled', true);
			$("#uploadFileAlert").removeClass("alert");
			$("#uploadFileAlert").removeClass("alert-danger");
			$("#uploadFileAlert").text("");
			var filenames = new Array();
			for (var i = 0; i < fs.length; i++) {
				filenames[i] = fs[i].name.replace(/^.+?\\([^\\]+?)?$/gi, "$1");
			}
			var namelist = JSON.stringify(filenames);
			
			$.ajax({
				type : "POST",
				dataType : "text",
				data : {
					folderId : locationpath,
					namelist : namelist
				},
				url : "homeController/checkUploadFile.ajax",
				success : function(result) {
					if (result == "mustLogin") {
						window.location.href = "login.html";
					} else {
						if (result == "errorParameter") {
							showUploadFileAlert("提示：参数不正确，无法开始上传");
						} else if (result == "noAuthorized") {
							showUploadFileAlert("提示：您的操作未被授权，无法开始上传");
						} else if (result.startsWith("duplicationFileName:")) {
							showUploadFileAlert("提示：本路径下已存在同名的文件:["
									+ result.substring(20) + "]，无法开始上传");
						} else if (result == "permitUpload") {
							doupload(1);
						} else {
							showUploadFileAlert("提示：出现意外错误，无法开始上传");
						}
					}
				},
				error : function() {
					showUploadFileAlert("提示：出现意外错误，无法开始上传");
				}
			});
		}else{
			showUploadFileAlert("提示：您未选择任何文件，无法开始上传");
		}
	}
}

var xhr;

// 执行文件上传并实现上传进度显示
function doupload(count) {
	var fcount = fs.length;
	$("#pros").width("0%");// 先将进度条置0
	var uploadfile = fs[count - 1];// 获取要上传的文件
	if (uploadfile != null) {
		var fname = uploadfile.name;
		if (fcount > 1) {
			$("#filecount").text("（" + count + "/" + fcount + "）");// 显示当前进度
		}
		$("#uploadstatus").prepend(
				"<p>" + fname + "<span id='uls_" + count
						+ "'>[正在上传...]</span></p>");
		xhr = new XMLHttpRequest();// 这东西类似于servlet里面的request

		var fd = new FormData();// 用于封装文件数据的对象

		fd.append("file", uploadfile);// 将文件对象添加到FormData对象中，字段名为uploadfile
		fd.append("folderId", locationpath);

		xhr.open("POST", "homeController/douploadFile.ajax", true);// 上传目标

		xhr.upload.addEventListener("progress", uploadProgress, false);// 这个是对上传进度的监听
		// 上面的三个参数分别是：事件名（指定名称）、回调函数、是否冒泡（一般是false即可）

		xhr.send(fd);// 上传FormData对象

		// 上传结束后执行的回调函数
		xhr.onloadend = function() {
			if (xhr.status === 200) {
				// TODO 上传成功
				var result = xhr.responseText;
				if (result == "uploadsuccess") {
					$("#uls_" + count).text("[已完成]");
					if (count < fcount) {
						doupload(count + 1);
					} else {
						// 清空所有提示信息，还原上传窗口
						isUpLoading=false;
						$("#uploadfile").val("");
						$("#filepath").val("");
						$("#pros").width("0%");
						$("#umbutton").attr('disabled', false);
						$("#filecount").text("");
						$("#uploadstatus").text("");
						$("#selectcount").text("");
						$('#uploadFileModal').modal('hide');
						showFolderView(locationpath);
					}
				} else if (result == "uploaderror") {
					showUploadFileAlert("提示：出现意外错误，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#uls_" + count).text("[失败]");
				} else {
					showUploadFileAlert("提示：出现意外错误，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#uls_" + count).text("[失败]");
				}
			} else {
				showUploadFileAlert("提示：出现意外错误，文件：[" + fname + "]上传失败，上传被中断。");
				$("#uls_" + count).text("[失败]");
			}
		};
	} else {
		showUploadFileAlert("提示：要上传的文件不存在。");
		$("#uploadstatus").prepend(
				"<p>未找到要上传的文件<span id='uls_" + count + "'>[失败]</span></p>");
	}
}

function uploadProgress(evt) {
	if (evt.lengthComputable) {
		// evt.loaded：文件上传的大小 evt.total：文件总的大小
		var percentComplete = Math.round((evt.loaded) * 100 / evt.total);
		// 加载进度条，同时显示信息
		$("#pros").width(percentComplete + "%");
	}
}

// 显示上传文件状态提示
function showUploadFileAlert(txt) {
	isUpLoading=false;
	$("#uploadFileAlert").addClass("alert");
	$("#uploadFileAlert").addClass("alert-danger");
	$("#uploadFileAlert").text(txt);
	$("#umbutton").attr('disabled', false);
}

// 显示下载文件模态框
function showDownloadModel(fileId, fileName) {
	$("#downloadModal").modal('toggle');
	$("#downloadFileName").text("提示：您确认要下载文件：[" + fileName + "]么？");
	$("#downloadFileBox")
			.html(
					"<button id='dlmbutton' type='button' class='btn btn-primary' onclick='dodownload("
							+ '"' + fileId + '"' + ")'>开始下载</button>");
	$("#dlmbutton").attr('disabled', false);
}

// 执行下载操作
function dodownload(fileId) {
	$("#dlmbutton").attr('disabled', true);
	$("#downloadFileName").text("提示：准备开始下载，请稍候...");
	var t = setTimeout("$('#downloadModal').modal('hide');", 800);
	window.location.href = "homeController/downloadFile.do?fileId=" + fileId;
}

// 显示删除文件模态框
function showDeleteFileModel(fileId, fileName) {
	$('#deleteFileBox')
			.html(
					"<button id='dfmbutton' type='button' class='btn btn-danger' onclick='deleteFile("
							+ '"' + fileId + '"' + ")'>删除</button>");
	$("#dfmbutton").attr('disabled', false);
	$('#deleteFileMessage').text("提示：确定要彻底删除文件：[" + fileName + "]么？该操作不可恢复");
	$('#deleteFileModal').modal('toggle');
}

// 执行删除文件操作
function deleteFile(fileId) {
	$("#dfmbutton").attr('disabled', true);
	$('#deleteFileMessage').text("提示：正在删除，请稍候...");
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {
			fileId : fileId
		},
		url : "homeController/deleteFile.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFileMessage').text("提示：您的操作未被授权，删除失败");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#deleteFileMessage').text("提示：参数不正确，删除失败");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "cannotDeleteFile") {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "deleteFileSuccess") {
					$('#deleteFileModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
					$("#dfmbutton").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
			$("#dfmbutton").attr('disabled', false);
		}
	});
}

// 显示重命名文件模态框
function showRenameFileModel(fileId, fileName) {
	$("#newFileNamealert").removeClass("alert");
	$("#newFileNamealert").removeClass("alert-danger");
	$("#filerenamebox").removeClass("has-error");
	$("#newFileNamealert").text("");
	$("#renameFileBox").html(
			"<button type='button' class='btn btn-primary' onclick='renameFile("
					+ '"' + fileId + '"' + ")'>修改</button>");
	$("#newfilename").val(fileName);
	$("#renameFileModal").modal('toggle');
}

// 修改文件名
function renameFile(fileId) {
	var reg = new RegExp("[\/\|\\s\\\\\*\\<\\>" + '"' + "]+", "g");
	var newFileName = $("#newfilename").val();
	if (newFileName.length > 0) {
		if (newFileName.length < 128) {
			if (!reg.test(newFileName)) {
				$.ajax({
					type : "POST",
					dataType : "text",
					data : {
						fileId : fileId,
						newFileName : newFileName
					},
					url : "homeController/renameFile.ajax",
					success : function(result) {
						if (result == "mustLogin") {
							window.location.href = "login.html";
						} else {
							if (result == "cannotRenameFile") {
								showRenameFolderAlert("提示：出现意外错误，可能未能重命名文件");
							} else if (result == "renameFileSuccess") {
								$('#renameFileModal').modal('hide');
								showFolderView(locationpath);
							} else if (result == "errorParameter") {
								showRenameFolderAlert("提示：参数错误，重命名失败");
							} else if (result == "noAuthorized") {
								showRenameFolderAlert("提示：您的操作未被授权，重命名失败");
							} else {
								showRenameFolderAlert("提示：出现意外错误，可能未能重命名文件");
							}
						}
					},
					error : function() {
						showRenameFolderAlert("提示：出现意外错误，可能未能重命名文件");
					}
				});
			} else {
				showRenameFolderAlert("提示：文件名中不应含有：空格 引号 / \ * | < > ");
			}
		} else {
			showRenameFolderAlert("提示：文件名称太长");
		}
	} else {
		showRenameFolderAlert("提示：文件名不能为空");
	}
}

// 显示重命名文件状态提示
function showRenameFolderAlert(txt) {
	$("#newFileNamealert").addClass("alert");
	$("#newFileNamealert").addClass("alert-danger");
	$("#filerenamebox").addClass("has-error");
	$("#newFileNamealert").text(txt);
}

// 取消上传
function abortUpload() {
	isUpLoading=false;
	if (xhr != null) {
		xhr.abort();
		$("#umbutton").attr('disabled', false);
		$("#pros").width("0%");
		$("#filecount").text("");
	}
	$("#uploadfile").val("");
	$("#filepath").val("");
	$("#uploadstatus").html("");
	$("#selectcount").text("");
	$('#uploadFileModal').modal('hide');
	showFolderView(locationpath);
}

// 获取文件名的后缀名，以小写形式输出
function getSuffix(filename) {
	var index1 = filename.lastIndexOf(".");
	var index2 = filename.length;
	var suffix = filename.substring(index1 + 1, index2);
	return suffix.toLowerCase();
}

// 播放指定格式的视频
function playVideo(fileId) {
	window.open("quickview/video.html?fileId=" + fileId);
}

// 预览PDF文档
function pdfView(fileId) {
	window.open("homeController/pdfView.do?fileId=" + fileId);
}

// 查看图片
function showPicture(fileId) {
	$.ajax({
		url : "homeController/getPrePicture.ajax",
		data : {
			fileId : fileId
		},
		type : "POST",
		dataType : "text",
		success : function(result) {
			if (result != "ERROR") {
				var pvl = eval("(" + result + ")");
				// TODO 整合viewer.js插件
				var imageslist = document.createElement("ul");
				$.each(pvl.pictureViewList, function(n, val) {
					var image = new Image();
					// 判断直接显示原图还是请求压缩流
					if(val.filePath.startsWith("homeController")){
						image.src = val.filePath;
					}else{
						image.src = "fileblocks/"+val.filePath;
					}
					image.alt = val.fileName;
					var imagerow = document.createElement("li");
					imagerow.appendChild(image);
					imageslist.appendChild(imagerow);
				});
				viewer = new Viewer(imageslist, {
					hidden : function() {
						viewer.destroy();
					}
				});
				viewer.view(pvl.index);
				viewer.show();
			} else {
				alert("错误：无法定位要预览的文件或该操作未被授权。");
			}
		},
		error : function() {
			alert("错误：请求失败，请刷新重试。");
		}
	});
}

// 选中某一行文件，如果使用Shift点击则为多选
function checkfile(fileId) {
	if (!window.event.shiftKey) {
		$(".filerow").removeClass("info");
		$("#" + fileId).addClass("info");
	} else {
		if ($("#" + fileId).hasClass("info")) {
			$("#" + fileId).removeClass("info");
		} else {
			$("#" + fileId).addClass("info");
		}
	}
}

var checkAll = true;

// 切换全部文件行的选中或非选中
function checkallfile() {
	if (checkAll) {
		$(".filerow").addClass("info");
		checkAll = false;
	} else {
		$(".filerow").removeClass("info");
		checkAll = true;
	}
}

// 显示打包下载模态框
function showDownloadAllCheckedModel() {
	$("#downloadAllCheckedBox").html("");
	$("#downloadAllCheckedLoad").text("");
	var checkedfiles = $(".info").get();
	if (checkedfiles.length == 0) {
		$("#downloadAllCheckedName")
				.text(
						"提示：您还未选择任何文件，请先选中一些文件后再执行本操作（点击某一文件行来选中单一文件；按住Shift并点击文件行选中多个文件；使用Shitf+A选中/取消选中所有文件）。");
	} else {
		$("#downloadAllCheckedName").text(
				"提示：您确认要打包并下载这" + checkedfiles.length + "项么？");
		$("#downloadAllCheckedBox")
				.html(
						"<button id='dclmbutton' type='button' class='btn btn-primary' onclick='downloadAllChecked()'>开始下载</button>");
		$("#dclmbutton").attr('disabled', false);
	}
	$("#downloadAllCheckedModal").modal('toggle');
}

// 下载选中的所有文件
function downloadAllChecked() {
	$("#dclmbutton").attr('disabled', true);
	var checkedfiles = $(".info").get();
	var downloadIdArray = new Array();
	for (var i = 0; i < checkedfiles.length; i++) {
		downloadIdArray[i] = checkedfiles[i].id;
	}
	var strIdList = JSON.stringify(downloadIdArray);
	$("#downloadAllCheckedName").text(
			"提示：服务器正在对选中资源进行压缩（共" + checkedfiles.length
			+ "项），这可能需要一些时间（文件越大耗时越长），压缩完成将自动开始下载。");
	// 计算预计耗时
	$.ajax({
		url:'homeController/getPackTime.ajax',
		type:'POST',
		data:{
			strIdList:strIdList
		},
		dataType:'text',
		success:function(result){
			if(result!="0"){
				var count = 0;
				$("#downloadAllCheckedLoad").text("已耗时："+count+"秒（预计耗时："+result+"）");
				zipTimer=setInterval(function() {
					count++;
					$("#downloadAllCheckedLoad").text("已耗时："+count+"秒（预计耗时："+result+"）");
				},1000);
			}else{
				var count = 0;
				$("#downloadAllCheckedLoad").text("已耗时："+count+"秒");
				zipTimer=setInterval(function() {
					count++;
					$("#downloadAllCheckedLoad").text("已耗时："+count+"秒");
				},1000);
			}
		},
		error:function(){
			$("#downloadAllCheckedLoad").text("（无法获取预计耗时）");
		}
	});
	// 同时发送压缩下载请求
	$.ajax({
		type : "POST",
		url : "homeController/downloadCheckedFiles.ajax",
		data : {
			strIdList : strIdList
		},
		dataType : "text",
		success : function(result) {
			if(zipTimer!=null){
				window.clearInterval(zipTimer);
			}
			if (result == "ERROR") {
				$("#downloadAllCheckedName")
						.text("提示：压缩过程出错。无法完成压缩，请重试或告知管理员。");
			} else {
				$("#downloadAllCheckedLoad").text("");
				$("#downloadAllCheckedName").text("提示：压缩完成！准备开始下载...");
				var t = setTimeout(
						"$('#downloadAllCheckedModal').modal('hide');", 800);
				// POST提交全部下载请求
				var temp = document.createElement("form");
				temp.action = 'homeController/downloadCheckedFilesZip.do';
				temp.method = "post";
				temp.style.display = "none";
				var sl = document.createElement("input");
				sl.name = 'zipId';
				sl.value = result;
				temp.appendChild(sl);
				document.body.appendChild(temp);
				temp.submit();
			}
		},
		error : function() {
			$("#downloadAllCheckedName").text("提示：请求失败。无法完成压缩，请重试或告知管理员。");
		}
	});
}

// 删除选中的所有文件
function showDeleteAllCheckedModel() {
	$('#deleteFileBox').html("");
	var checkedfiles = $(".info").get();
	$("#dfmbutton").attr('disabled', false);
	if (checkedfiles.length == 0) {
		$('#deleteFileMessage')
				.text(
						"提示：您还未选择任何文件，请先选中一些文件后再执行本操作（点击某一文件行来选中单一文件；按住Shift并点击文件行选中多个文件；使用Shift+A选中/取消选中所有文件）。");
	} else {
		$('#deleteFileBox')
				.html(
						"<button id='dfmbutton' type='button' class='btn btn-danger' onclick='deleteAllChecked()'>全部删除</button>");
		$('#deleteFileMessage').text(
				"提示：确定要彻底删除这" + checkedfiles.length + "项么？该操作不可恢复");
	}
	$('#deleteFileModal').modal('toggle');
}

// 删除选中的所有文件
function deleteAllChecked() {
	// TODO 提交全部删除请求
	var checkedfiles = $(".info").get();
	var downloadIdArray = new Array();
	for (var i = 0; i < checkedfiles.length; i++) {
		downloadIdArray[i] = checkedfiles[i].id;
	}
	var strIdList = JSON.stringify(downloadIdArray);
	$("#dfmbutton").attr('disabled', true);
	$('#deleteFileMessage').text("提示：正在删除，请稍候...");
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {
			strIdList : strIdList
		},
		url : "homeController/deleteCheckedFiles.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFileMessage').text("提示：您的操作未被授权，删除失败");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#deleteFileMessage').text("提示：参数不正确，未能全部删除文件");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "cannotDeleteFile") {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
					$("#dfmbutton").attr('disabled', false);
				} else if (result == "deleteFileSuccess") {
					$('#deleteFileModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
					$("#dfmbutton").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
			$("#dfmbutton").attr('disabled', false);
		}
	});
}

// 播放音乐
function playAudio(fileId) {
	$('#audioPlayerModal').modal('show');
	if (ap == null) {
		ap = new APlayer({
			container : document.getElementById('aplayer'),
			lrcType : 3,
			mutex : true,
			volume : 0.7,
			theme:'#EDEDED',
			audio : []
		});
		ap.on('pause', function() {
			$("#playOrPause").html("<span class='glyphicon glyphicon-play' aria-hidden='true'></span>");
		});
		ap.on('play', function() {
			$("#playOrPause").html("<span class='glyphicon glyphicon-pause' aria-hidden='true'></span>");
		});
	}
	ap.list.clear();
	$.ajax({
		url:'homeController/playAudios.ajax',
		data:{
			fileId:fileId
		},
		type:'POST',
		dataType:'text',
		success:function(result){
			var ail=eval("("+result+")");
			ap.list.add(ail.as);
			ap.list.switch(ail.index);
			audio_play();
		},
		error:function(){
			alert("错误：无法获取音乐列表，请稍后再试");
			closeAudioPlayer();
		}
	});
}

// 关闭音乐播放器
function closeAudioPlayer() {
	$('#audioPlayerModal').modal('hide');
	ap.seek(0);
	ap.pause();
}

// 切换按钮状态与
function audio_playOrPause() {
	ap.toggle();
}

// 播放
function audio_play() {
	ap.play();
}

// 暂停
function audio_pasue() {
	ap.pause();
}

// 下一首
function audio_fw() {
	ap.skipForward();
}

// 上一首
function audio_bw() {
	ap.skipBack();
}

// 音量加大，每次10%
function audio_vulome_up(){
	ap.volume(ap.audio.volume+0.1,true);
}

// 音量减少，每次10%
function audio_vulome_down(){
	ap.volume(ap.audio.volume-0.1,true);
}

// 按文件名排序
function sortbyfn(){
	$("#sortByFN").addClass("glyphicon glyphicon-triangle-bottom");
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	folderView.fileList.sort(function(v1,v2){
		return v1.fileName.localeCompare(v2.fileName,"zh");
	});
	folderView.folderList.sort(function(v1,v2){
		return v1.folderName.localeCompare(v2.folderName,"zh");
	});
	showFolderTable(folderView);
}

// 按创建日期排序
function sortbycd(){
	$("#sortByFN").removeClass();
	$("#sortByCD").addClass("glyphicon glyphicon-triangle-bottom");
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	folderView.fileList.sort(function(v1,v2){
		var v1DateStr=v1.fileCreationDate.replace("年","-").replace("月","-").replace("日","");
		var v2DateStr=v2.fileCreationDate.replace("年","-").replace("月","-").replace("日","");
		var res=((new Date(Date.parse(v1DateStr)).getTime())-(new Date(Date.parse(v2DateStr)).getTime()));
		return -1*res;
	});
	folderView.folderList.sort(function(v1,v2){
		var v1DateStr=v1.folderCreationDate.replace("年","-").replace("月","-").replace("日","");
		var v2DateStr=v2.folderCreationDate.replace("年","-").replace("月","-").replace("日","");
		var res=((new Date(Date.parse(v1DateStr)).getTime())-(new Date(Date.parse(v2DateStr)).getTime()));
		return -1*res;
	});
	showFolderTable(folderView);
}

// 按文件大小排序
function sortbyfs(){
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByFS").addClass("glyphicon glyphicon-triangle-bottom");
	$("#sortByCN").removeClass();
	folderView.fileList.sort(function(v1,v2){
		return v2.fileSize-v1.fileSize;
	});
	showFolderTable(folderView);
}

// 按创建者排序
function sortbycn(){
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").addClass("glyphicon glyphicon-triangle-bottom");
	folderView.fileList.sort(function(v1,v2){
		return v1.fileCreator.localeCompare(v2.fileCreator,"zh");
	});
	folderView.folderList.sort(function(v1,v2){
		return v1.folderCreator.localeCompare(v2.folderCreator,"zh");
	});
	showFolderTable(folderView);
}

// 显示原始的顺序
function showOriginFolderView(){
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	if(screenedFoldrView!=null){
		folderView=$.extend(true, {}, screenedFoldrView);
	}else{
		folderView=$.extend(true, {}, originFolderView);
	}
	showFolderTable(folderView);
}

// 确认文件移动（剪切-粘贴）操作
function startMoveFile(){
	if($("#cutSignTx").hasClass("cuted")&&checkedMovefiles!==undefined){
		var moveIdArray = new Array();
		for (var i = 0; i < checkedMovefiles.length; i++) {
			moveIdArray[i] = checkedMovefiles[i].id;
		}
		var strIdList = JSON.stringify(moveIdArray);
		$('#moveFilesMessage').text("提示：确定将这"+checkedMovefiles.length+"项移动到当前位置么？");
		$('#moveFilesBox').html("<button id='dmvfbutton' type='button' class='btn btn-danger' onclick='doMoveFiles()'>全部移动</button>");
		$('#moveFilesModal').modal('show');
	}else{
		checkedMovefiles = $("#foldertable .info").get();
		if (checkedMovefiles==undefined||checkedMovefiles.length == 0) {
			$('#moveFilesMessage').text("提示：您还未选择任何文件，请先选中一些文件后再执行本操作（点击某一文件行来选中单一文件；按住Shift并点击文件行选中多个文件；使用Shift+A选中/取消选中所有文件）。");
			$('#moveFilesModal').modal('show');
		} else {
			$("#cutSignTx").text("粘贴（"+checkedMovefiles.length+"）");
			$("#cutSignTx").addClass("cuted");
		}
	}
}

// 执行文件移动操作
function doMoveFiles(){
	var moveIdArray = new Array();
	for (var i = 0; i < checkedMovefiles.length; i++) {
		moveIdArray[i] = checkedMovefiles[i].id;
	}
	var strIdList = JSON.stringify(moveIdArray);
	$("#dmvfbutton").attr('disabled', true);
	$('#moveFilesMessage').text("提示：正在移动，请稍候...");
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {
			strIdList : strIdList,
			locationpath:locationpath
		},
		url : "homeController/moveCheckedFiles.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "login.html";
			} else {
				if (result == "noAuthorized") {
					$('#moveFilesMessage').text("提示：您的操作未被授权，移动失败");
					$("#dmvfbutton").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#moveFilesMessage').text("提示：参数不正确，未能全部移动文件");
					$("#dmvfbutton").attr('disabled', false);
				} else if (result == "cannotMoveFiles") {
					$('#moveFilesMessage').text("提示：出现意外错误，可能未能移动全部文件");
					$("#dmvfbutton").attr('disabled', false);
				} else if (result == "moveFilesSuccess") {
					$('#moveFilesModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#moveFilesMessage').text("提示：出现意外错误，可能未能移动全部文件");
					$("#dmvfbutton").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#moveFilesMessage').text("提示：出现意外错误，可能未能移动全部文件");
			$("#dmvfbutton").attr('disabled', false);
		}
	});
}

var screenedFoldrView;// 经过排序的文件视图

// 执行搜索功能
function doSearchFile(){
	startLoading();
	try{
		var keyworld=$("#sreachKeyWordIn").val();
		if(keyworld.length!=0){
			var reg=new RegExp(keyworld+"+");
			screenedFoldrView=$.extend(true, {}, originFolderView);
			screenedFoldrView.folderList=[];
			screenedFoldrView.fileList=[];
			for(var i=0,j=originFolderView.folderList.length;i<j;i++){
				if(reg.test(originFolderView.folderList[i].folderName)){
					screenedFoldrView.folderList.push(originFolderView.folderList[i]);
				}
			}
			for(var i=0,j=originFolderView.fileList.length;i<j;i++){
				if(reg.test(originFolderView.fileList[i].fileName)){
					screenedFoldrView.fileList.push(originFolderView.fileList[i]);
				}
			}
			$("#sortByFN").removeClass();
			$("#sortByCD").removeClass();
			$("#sortByFS").removeClass();
			$("#sortByCN").removeClass();
			folderView=$.extend(true, {}, screenedFoldrView);
			showFolderTable(folderView);
		}else{
			screenedFoldrView=null;
			showOriginFolderView();
		}
	}catch(e){
		alert("错误：搜索关键字有误。请在特殊符号（例如“*”）前加上“\\”进行转义。");
	}
	endLoading();
}