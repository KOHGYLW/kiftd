/**
 * home.js kiftd主页面操作定义 by 青阳龙野 该文件为home.html的操作定义文件，包含了kiftd页面上的主要操作实现。
 */

// 所用val名称列表，注意不要冲突，其中一些参数能够设定界面行为。
var locationpath = "root";// 记录当前文件路径
var parentpath = "null";// 记录当前文件路径的父级目录
var ap;// 音乐播放器对象
var zipTimer;// 打包下载计时器
var folderView;// 返回的文件系统视图对象
var originFolderView;// 保存原始的文件视图对象
var fs;// 选中的要上传的文件列表
var ifs;// 选中的要上传的文件夹内的文件列表
var checkedMovefiles;// 移动文件的存储列表
var isCopy;// 移动文件是否为复制模式，如果是，则“复制”，否则“剪切”
var repeMap;// 移动文件时，保存用户对每个冲突项目的处理操作
var strMoveOptMap;// 移动（或复制）操作导致文件名冲突的项目
var mRepeSize;// 移动（或复制）操作导致文件名冲突的项目数
var constraintLevel;// 当前文件夹限制等级
var account;// 用户账户
var isUpLoading = false;// 是否正在执行上传操作
var isImporting = false;// 是否正在执行上传文件夹操作
var isChangingPassword = false;// 是否正在执行修改密码操作
var importFolderName;// 上传文件夹时保存文件夹名称
var xhr;// 文件或文件夹上传请求对象
var viewerPageSize = 15; // 显示图片页的最大长度，注意最好是奇数
var viewer; // viewer对象，用于预览图片功能
var viewerPageIndex; // 分页预览图片——已浏览图片页号
var viewerTotal; // 分页预览图片——总页码数
var pvl;// 预览图片列表的JSON格式对象
var checkFilesTip = "提示：您还未选择任何文件，请先选中一些文件后再执行本操作：<br /><br /><kbd>单击</kbd>：选中某一文件<br /><br /><kbd><kbd>Shift</kbd>+<kbd>单击</kbd></kbd>：选中多个文件<br /><br /><kbd><kbd>Shift</kbd>+<kbd>双击</kbd></kbd>：选中连续的文件<br /><br /><kbd><kbd>Shitf</kbd>+<kbd>A</kbd></kbd>：选中/取消选中所有文件";// 选取文件提示
var winHeight;// 窗口高度
var pingInt;// 定时应答器的定时装置
var noticeInited = false;// 公告信息的md5标识
var loadingComplete;// 判断文件夹视图是否加载完成
var totalFoldersOffset;// 记录文件夹原始的查询偏移量，便于计算加载进度
var totalFilesOffset;// 记录文件原始的查询偏移量，便于计算加载进度
var remainingLoadingRequest;// 后续数据加载请求的索引，便于中途取消
var loadingFolderView;// 是否正在加载文件夹视图的判断，避免重复操作

// 界面功能方法定义
// 页面初始化
$(function() {
	window.onresize = function() {
		changeFilesTableStyle();
		updateWinHeight();
	}
	changeFilesTableStyle();
	getServerOS();// 得到服务器操作系统信息
	subscribeNotice();// 加载公告MD5，以判断是否需要显示最新公告
	// 查询是否存在记忆路径，若有，则直接显示记忆路径的内容，否则显示ROOT根路径
	var arr = document.cookie.match(new RegExp("(^| )folder_id=([^;]*)(;|$)"));
	if (arr != null) {
		showFolderView(unescape(arr[2]));// 显示记忆路径页面视图
	} else {
		showFolderView("root");// 显示根节点页面视图
	}
	// 点击空白处取消选中文件（已尝试兼容火狐，请期待用户反馈，如不好使再改）
	$(document).click(function(e) {
		var filetable = $("#filetable")[0];
		var srcElement = e.srcElement;
		if (!srcElement) {
			srcElement = e.target;
		}
		if (srcElement !== filetable && !$.contains(filetable, e.target)) {
			$(".filerow").removeClass("info");
		}
	});
	// 关闭音乐播放模态框自动停止播放并将进度归0
	$('#audioPlayerModal').on('hidden.bs.modal', function(e) {
		if (ap != null) {
			ap.seek(0);
			ap.pause();
		}
		if (pingInt != null) {
			window.clearInterval(pingInt);
			pingInt = null;
		}
	});
	// 关闭打包下载模态框自动停止计时
	$('#downloadAllCheckedModal').on('hidden.bs.modal', function(e) {
		if (zipTimer != null) {
			window.clearInterval(zipTimer);
		}
	});
	// 关闭登陆模态框自动清空输入数据
	$('#loginModal').on('hidden.bs.modal', function(e) {
		if ($("#dologinButton").attr('disabled') !== 'disabled') {
			$("#accountid").val('');
			$("#accountpwd").val('');
		}
		$("#accountidbox").removeClass("has-error");
		$("#accountpwdbox").removeClass("has-error");
		$("#alertbox").removeClass("alert");
		$("#alertbox").removeClass("alert-danger");
		$("#alertbox").text("");
		$("#vercodebox").html("");
		$("#vercodebox").removeClass("show");
		$("#vercodebox").addClass("hidden");
	});
	// 各个模态框的打开判定及回车响应功能。该功能仅对“首选”的按钮有效，对其他按钮无效，以避免用户误操作。
	$('.modal').on('shown.bs.modal', function(e) {
		$(this).addClass("shown");
	});
	$('.modal').on('hidden.bs.modal', function(e) {
		$(this).removeClass("shown");
	});
	$("body").keypress(function(e) {
		var keyCode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if (keyCode == 13) {
			if ("sreachKeyWordIn" === document.activeElement.id) {
				doSearchFile();
			} else {
				var g = $(".shown .btn-primary");
				if (g.get(0) != null && g.prop("disabled") == false) {
					g.click();
				}
			}
			return false;
		}
	});
	// 开启登陆模态框自动聚焦账户输入框
	$('#loginModal').on('shown.bs.modal', function(e) {
		$("#accountid").focus();
	});
	// 开启新建文件夹框自动初始化状态
	$('#newFolderModal')
			.on(
					'show.bs.modal',
					function(e) {
						$("#folderalert").removeClass("alert");
						$("#folderalert").removeClass("alert-danger");
						$("#foldernamebox").removeClass("has-error");
						$("#folderalert").text("");
						$("#foldername").val("");
						$("#foldertypelist").html("");
						if (account != null) {
							$("#foldername").attr("folderConstraintLevel",
									constraintLevel + "");
							$("#newfoldertype").text(
									folderTypes[constraintLevel]);
							for (var i = constraintLevel; i < folderTypes.length; i++) {
								$("#foldertypelist").append(
										"<li><a onclick='changeNewFolderType("
												+ i + ")'>" + folderTypes[i]
												+ "</a></li>");
							}
						} else {
							$("#foldertypelist").append(
									"<li><a onclick='changeNewFolderType(0)'>"
											+ folderTypes[0] + "</a></li>");
						}
					});
	// 开启新建文件夹模态框自动聚焦文件名输入框
	$('#newFolderModal').on('shown.bs.modal', function(e) {
		$("#foldername").focus();
	});
	// 关闭上传模态框时自动提示如何查看上传进度
	$('#uploadFileModal,#importFolderModal').on('hidden.bs.modal', function(e) {
		if (isUpLoading || isImporting) {
			$('#operationMenuBox').attr("data-placement", "top");
			$('#operationMenuBox').attr("data-trigger", "focus");
			$('#operationMenuBox').attr("data-title", "上传中");
			$('#operationMenuBox').attr("data-content", "您可以重新打开上传窗口查看上传进度。");
			$('#operationMenuBox').popover();
			$('#operationMenuBox').popover('show');
			// 2秒后消失提示框
			var closeUploadTips = setTimeout(function() {
				$('#operationMenuBox').attr("data-title", "");
				$('#operationMenuBox').attr("data-content", "");
				$('#operationMenuBox').popover('destroy');
			}, 2000);
		}
	});
	// 开启编辑文件夹框自动初始化状态
	$('#renameFolderModal')
			.on(
					'show.bs.modal',
					function(e) {
						$("#editfolderalert").removeClass("alert");
						$("#editfolderalert").removeClass("alert-danger");
						$("#folderrenamebox").removeClass("has-error");
						$("#editfolderalert").text("");
						$("#editfoldertypelist").html("");
						if (account != null) {
							for (var i = constraintLevel; i < folderTypes.length; i++) {
								$("#editfoldertypelist").append(
										"<li><a onclick='changeEditFolderType("
												+ i + ")'>" + folderTypes[i]
												+ "</a></li>");
							}
						} else {
							$("#editfoldertypelist").append(
									"<li><a onclick='changeEditFolderType(0)'>"
											+ folderTypes[0] + "</a></li>");
						}
					});
	// 响应拖动上传文件
	document.ondragover = function(e) {
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		} else {
			window.event.cancelBubble = true;
			window.event.returnValue = false;
		}
	}
	document.ondrop = function(e) {
		if (e.preventDefault) {
			e.preventDefault();
			e.stopPropagation();
		} else {
			window.event.cancelBubble = true;
			window.event.returnValue = false;
		}
		if (folderView.authList != null) {
			if (checkAuth(folderView.authList, "U")) {// 如果有上传权限且未进行其他上传
				if (isUpLoading || isImporting) {
					alert("提示：您正在执行另一项上传任务，请在上传完成后再试。");
				} else {
					if (!(window.ActiveXObject || "ActiveXObject" in window)) {// 判断是否为IE
						var dt;
						if (e.dataTransfer != null) {
							dt = e.dataTransfer; // 获取到拖入上传的文件对象
						} else {
							dt = window.event.dataTransfer;
						}
						var testFile = true;
						if (dt.items !== undefined) {
							for (var i = 0; i < dt.items.length; i++) {
								var item = dt.items[i];
								if (item.kind === "file"
										&& item.webkitGetAsEntry().isFile) {

								} else {
									testFile = false;
								}
							}
						} else {
							for (var i = 0; i < dt.files.length; i++) {
								var dropFile = df.files[i];
								if (dropFile.type) {

								} else {
									try {
										var fileReader = new FileReader();
										fileReader.readAsDataURL(dropFile
												.slice(0, 10));
										fileReader.addEventListener('load',
												function(e) {

												}, false);
										fileReader.addEventListener('error',
												function(e) {
													testFile = false;
												}, false);
									} catch (e) {
										testFile = false;
									}
								}
							}
						}
						if (testFile) {
							fs = e.dataTransfer.files; // 获取到拖入上传的文件对象
							showUploadFileModel();
							showfilepath();
							checkUploadFile();
						} else {
							alert("提示：您拖入的文件中包含了一个或多个文件夹，无法进行上传。");
						}
					} else {
						alert("提示：IE浏览器不支持拖拽上传。您可以使用现代浏览器或将浏览模式切换为“极速模式”来体验该功能。");
					}
				}
			} else {
				alert("提示：您不具备上传权限，无法上传文件。");
			}
		} else {
			alert("提示：您不具备上传权限，无法上传文件。");
		}
	}
	// 各种快捷键绑定
	$(document).keypress(
			function(e) {
				if ($('.modal.shown').length == 0
						|| ($('.modal.shown').length == 1 && $('.modal.shown')
								.attr('id') == 'loadingModal')) {
					var keyCode = e.keyCode ? e.keyCode : e.which ? e.which
							: e.charCode;
					if (isShift(e)
							&& document.activeElement.id != "sreachKeyWordIn") {// 在按住shift的情况下……
						switch (keyCode) {
						case 65:// shift+a 全选
							checkallfile();
							break;
						case 78:// shift+n 新建文件夹
							$('#createFolderButtonLi a').click();
							break;
						case 85:// shift+u 上传文件
							$('#uploadFileButtonLi a').click();
							break;
						case 68:// shift+d 删除
							$('#deleteSeelectFileButtonLi a').click();
							break;
						case 70:// shift+f 上传文件夹
							$('#uploadFolderButtonLi a').click();
							break;
						case 67:// shift+c 复制
							if (checkedMovefiles == undefined
									|| checkedMovefiles.size == 0) {
								$('#copyFileButtonLi a').click();
							}
							break;
						case 88:// shift+x 剪切
							if (checkedMovefiles == undefined
									|| checkedMovefiles.size == 0) {
								$('#cutFileButtonLi a').click();
							}
							break;
						case 86:// shift+v 粘贴
							if (checkedMovefiles !== undefined
									&& checkedMovefiles.size > 0) {
								$('#stickFileButtonLi a').click();
							}
							break;
						default:
							return true;
						}
						return false;
					}
				}
			});
	// 关闭移动提示框自动取消移动
	$('#moveFilesModal').on('hidden.bs.modal', function(e) {
		checkedMovefiles = undefined;
		$("#copyFileButtonLi").removeClass("hidden");
		$("#copyFileButtonLi").addClass("show");
		$("#cutFileButtonLi").removeClass("hidden");
		$("#cutFileButtonLi").addClass("show");
		$("#stickFileButtonLi").removeClass("show");
		$("#stickFileButtonLi").addClass("hidden");
		$("#stickFilesCount").text("");
		$('#moveFilesBox').html("");
	});
	// IE内核浏览器内的startsWith方法的自实现
	if (typeof String.prototype.startsWith != 'function') {
		String.prototype.startsWith = function(prefix) {
			return this.slice(0, prefix.length) === prefix;
		};
	}
	if (typeof String.prototype.endsWith != 'function') {
		String.prototype.endsWith = function(suffix) {
			return this.indexOf(suffix, this.length - suffix.length) !== -1;
		};
	}
	// 关闭下载提示模态框自动隐藏下载链接
	$('#downloadModal').on('hidden.bs.modal', function(e) {
		$('#downloadURLCollapse').collapse('hide');
	});
	// 获取窗口高度
	updateWinHeight();
	// 根据屏幕下拉程度自动显示、隐藏“返回顶部”按钮
	$(window).scroll(function() {
		if ($(this).scrollTop() > 2 * winHeight) {
			$('#gobacktotopbox').removeClass("hidden");
		} else {
			$('#gobacktotopbox').addClass("hidden");
		}
	});

	// 打开查看下载链接时，向后台生成/获取下载链接
	$('#downloadURLCollapse').on('shown.bs.collapse', function() {
		getDownloadURL();
	});

	// 开启修改密码模态框时初始化状态
	$('#changePasswordModal')
			.on(
					'show.bs.modal',
					function(e) {
						if (!isChangingPassword) {
							$(
									"#changepassword_oldpwd,#changepassword_newpwd,#changepassword_reqnewpwd,#changePasswordButton,#changepassword_vercode")
									.attr('disabled', false);
							$(
									"#changepassword_oldepwdbox,#changepassword_newpwdbox,#changepassword_reqnewpwdbox")
									.removeClass("has-error");
							$(
									"#changepassword_oldpwd,#changepassword_newpwd,#changepassword_reqnewpwd")
									.val("");
							$(
									"#changepasswordalertbox,#changepassword_vccodebox")
									.hide();
						}
					});
	// 并自动聚焦旧密码输入框
	$('#changePasswordModal').on('shown.bs.modal', function(e) {
		if (!isChangingPassword) {
			$("#changepassword_oldpwd").focus();
		}
	});
	// 开启公告信息模态框前自动判断是否已经勾选“30天不再显示”
	$('#noticeModal').on(
			'show.bs.modal',
			function(e) {
				var cookieMd530 = document.cookie.match(new RegExp(
						"(^| )notice_md5_30=([^;]*)(;|$)"));
				if (cookieMd530) {
					$("#dontShowSomeNoticeAt30Day").attr("checked", "checked");
				} else {
					$("#dontShowSomeNoticeAt30Day").attr("checked", false);
				}
			});
	// 关闭公告信息模态框后根据是否已经勾选“30天不再显示”设置cookie
	$('#noticeModal').on(
			'hidden.bs.modal',
			function(e) {
				var noticed = new Date();
				if ($("#dontShowSomeNoticeAt30Day").prop("checked")) {
					noticed.setTime(noticed.getTime()
							+ (30 * 24 * 60 * 60 * 1000));
					var cookieMd5 = document.cookie.match(new RegExp(
							"(^| )notice_md5=([^;]*)(;|$)"));
					if (cookieMd5) {
						document.cookie = "notice_md5_30="
								+ escape(unescape(cookieMd5[2])) + ";expires="
								+ noticed.toUTCString();
					} else {
						cookieMd5 = document.cookie.match(new RegExp(
								"(^| )notice_md5_30=([^;]*)(;|$)"));
						if (cookieMd5) {
							document.cookie = "notice_md5_30="
									+ escape(unescape(cookieMd5[2]))
									+ ";expires=" + noticed.toUTCString();
						}
					}
				} else {
					noticed.setTime(0);
					var cookieMd530 = document.cookie.match(new RegExp(
							"(^| )notice_md5_30=([^;]*)(;|$)"));
					if (cookieMd530) {
						document.cookie = "notice_md5_30=0;expires="
								+ noticed.toUTCString();
					}
				}
			});
});

// 更新页面高度
function updateWinHeight() {
	if (window.innerHeight) {
		winHeight = window.innerHeight;
	} else if ((document.body) && (document.body.clientHeight)) {
		winHeight = document.body.clientHeight;
	}
}

// 根据屏幕大小增删表格显示内容
function changeFilesTableStyle() {
	var win = $(window).width();
	if (win < 768) {
		$('#filetableheadera').addClass('filetableheaderstyle');
		$('#filetableheadera').attr('data-toggle', 'collapse');
		$('#filetableheadera').attr('data-target', '#filetableoptmenu');
		$('#mdropdownicon').html('（点击展开/折叠菜单）');
	} else {
		$('#filetableheadera').removeClass('filetableheaderstyle');
		$('#filetableheadera').attr('data-toggle', 'modal');
		$('#filetableheadera').attr('data-target', '#folderInfoModal');
		$('#mdropdownicon').html('');
	}
}

// 全局请求失败提示
function doAlert() {
	alert("错误：无法连接到kiftd服务器，请检查您的网络连接或查看服务器运行状态。");
}

// 获取服务器操作系统
function getServerOS() {
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {},
		url : "homeController/getServerOS.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "prv/login.html";
				return;
			}
			$("#serverOS").text(result);
		},
		error : function() {
			$("#serverOS").html("<a onclick='getServerOS()'>获取失败，点击重试</a>");
		}
	});
}

// 获取实时文件夹视图
function showFolderView(fid, targetId) {
	// 判断是否正在进行另一个相同的请求，如果是则取消本次操作
	if (loadingFolderView) {
		return;
	}
	startLoading();
	if (remainingLoadingRequest) {
		remainingLoadingRequest.abort();
	}
	$.ajax({
		type : 'POST',
		dataType : 'text',
		data : {
			fid : fid
		},
		url : 'homeController/getFolderView.ajax',
		success : function(result) {
			endLoading();
			switch (result) {
			case "ERROR":
				// 获取错误直接弹出提示框并将相关内容填为提示信息
				doAlert();
				$("#tb").html("<span class='graytext'>获取失败，请尝试刷新</span>");
				$("#publishTime").html(
						"<span class='graytext'>获取失败，请尝试刷新</span>");
				$("#parentlistbox").html(
						"<span class='graytext'>获取失败，请尝试刷新</span>");
				break;
			case "NOT_FOUND":
			case "notAccess":
				// 对于各种不能访问的情况，要先将记忆路径重置再跳转至根路径下
				document.cookie = "folder_id=" + escape("root");
			case "mustLogin":
				// 如果服务器说必须登录，那么也跳转至根路径下（从而进入登录页面）
				window.location.href = "/";
				break;
			default:
				// 上述情况都不是，则返回的应该是文件夹视图数据，接下来对其进行解析
				folderView = eval("(" + result + ")");
				// 记录当前获取的文件夹视图的ID号，便于其他操作使用
				locationpath = folderView.folder.folderId;
				// 存储打开的文件夹路径至Cookie中，以便下次打开时直接显示
				document.cookie = "folder_id=" + escape(locationpath);
				// 记录上级目录ID，方便返回上一级
				parentpath = folderView.folder.folderParent;
				// 记录本文件夹的访问级别，便于在新建文件夹时判断应该从哪一个级别开始供用户选择
				constraintLevel = folderView.folder.folderConstraint;
				screenedFoldrView = null;
				// 备份一份原始的文件夹视图数据，同时也记录下原始的查询偏移量
				originFolderView = $.extend(true, {}, folderView);
				totalFoldersOffset = folderView.foldersOffset;
				totalFilesOffset = folderView.filesOffset;
				// 搜索输入框重置
				$("#sreachKeyWordIn").val("");
				// 各项基于文件夹视图返回数据的解析操作……
				showParentList(folderView);
				showAccountView(folderView);
				showPublishTime(folderView);
				$("#sortByFN").removeClass();
				$("#sortByCD").removeClass();
				$("#sortByFS").removeClass();
				$("#sortByCN").removeClass();
				$("#sortByOR").removeClass();
				showFolderTable(folderView);
				// 更新文件夹信息至信息模态框
				$("#fim_name").text(folderView.folder.folderName);
				$("#fim_creator").text(folderView.folder.folderCreator);
				$("#fim_folderCreationDate").text(
						folderView.folder.folderCreationDate);
				$("#fim_folderId").text(folderView.folder.folderId);
				updateTheFolderInfo();
				// 判断是否还需要加载后续数据
				if (folderView.foldersOffset > folderView.selectStep
						|| folderView.filesOffset > folderView.selectStep) {
					// 如果文件夹偏移量或文件偏移量大于查询步进长度，则说明一定还有后续数据需要加载，那么继续加载后续数据
					showLoadingRemaininngBox();
					loadingRemainingFolderView(targetId);
				} else {
					// 否则，说明文件夹视图加载完成，进行定位工作即可
					hiddenLoadingRemaininngBox();
					doFixedRow(targetId);
				}
				break;
			}
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
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
function startLoading() {
	loadingFolderView = true;
	$('#loadingModal').modal({
		backdrop : 'static',
		keyboard : false
	});
	$('#loadingModal').modal('show');
	$('#loadingModal').addClass("shown");
}

// 结束文件视图加载动画
function endLoading() {
	loadingFolderView = false;
	$('#loadingModal').modal('hide');
	$('#loadingModal').removeClass("shown");
}

// 开始登陆加载动画
function startLogin() {
	$("#accountid").attr('disabled', 'disabled');
	$("#accountpwd").attr('disabled', 'disabled');
	$("#dologinButton").attr('disabled', 'disabled');
	$("#vercode").attr('disabled', 'disabled');
}

// 结束登陆加载动画
function finishLogin() {
	$("#accountid").removeAttr('disabled');
	$("#accountpwd").removeAttr('disabled');
	$("#dologinButton").removeAttr('disabled');
	$("#vercode").removeAttr('disabled');
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
				var publicKeyInfo = eval("(" + result + ")");
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
	$
			.ajax({
				type : "POST",
				dataType : "text",
				url : "homeController/doLogin.ajax",
				data : {
					encrypted : encrypted,
					vercode : $("#vercode").val()
				},
				success : function(result) {
					finishLogin();
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
					case "needsubmitvercode":
						$("#vercodebox")
								.html(
										"<label id='vercodetitle' class='col-sm-7'><img id='showvercode' class='vercodeimg' alt='点击获取验证码' src='homeController/getNewVerCode.do?s="
												+ (new Date()).getTime()
												+ "' onclick='getNewVerCode()'></label><div class='col-sm-5'><input type='text' class='form-control' id='vercode' placeholder='验证码……'></div>");
						$("#vercodebox").removeClass("hidden");
						$("#vercodebox").addClass("show");
						break;
					case "error":
						$("#alertbox").addClass("alert");
						$("#alertbox").addClass("alert-danger");
						$("#alertbox").text(
								"提示：登录失败，登录请求无法通过加密效验（可能是请求耗时过长导致的）");
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

// 获取一个新的验证码
function getNewVerCode() {
	$("#showvercode").attr("src",
			"homeController/getNewVerCode.do?s=" + (new Date()).getTime());
}

// 注销操作
function dologout() {
	$('#logoutModal').modal('hide');
	$.ajax({
		url : 'homeController/doLogout.ajax',
		type : 'POST',
		data : {},
		dataType : 'text',
		success : function(result) {
			if (result == "SUCCESS") {
				showFolderView(locationpath);
			}
		},
		error : function() {
			doAlert();
		}
	});
}

// 显示当前文件夹的父级路径
function showParentList(folderView) {
	$("#parentFolderList").html("");
	var f = folderView.folder;
	if (folderView.parentList.length > 0) {
		$.each(folderView.parentList, function(n, val) {
			$("#parentFolderList").append(
					"<li><a href='javascript:void(0);' onclick='entryFolder("
							+ '"' + val.folderId + '"' + ")'>" + val.folderName
							+ "</a></li>");
		});
	} else {
		$("#parentFolderList").html("<li class='disabled'><a>无</a></li>");
	}
	if (f.folderName.length > 6) {
		$("#currentFolderName").text(f.folderName.substr(0, 6) + "...");
	} else {
		$("#currentFolderName").text(f.folderName);
	}
	if (f.folderName == "ROOT") {
		$("#folderIconSpan").removeClass("glyphicon-folder-close");
		$("#folderIconSpan").removeClass("glyphicon-search");
		$("#folderIconSpan").addClass("glyphicon-home");
	} else if (folderView.keyWorld != null) {
		$("#folderIconSpan").removeClass("glyphicon-folder-close");
		$("#folderIconSpan").removeClass("glyphicon-home");
		$("#folderIconSpan").addClass("glyphicon-search");
	} else {
		$("#folderIconSpan").removeClass("glyphicon-home");
		$("#folderIconSpan").removeClass("glyphicon-search");
		$("#folderIconSpan").addClass("glyphicon-folder-close");
	}
}

// 显示用户视图，包括文件列表、登录信息、操作权限接口等
function showAccountView(folderView) {
	$("#tb,#tb2").html("");
	account = folderView.account;
	if (folderView.account != null) {
		// 说明已经登录，显示注销按钮
		$("#tb")
				.append(
						"<button class='btn btn-link rightbtn hidden-xs' data-toggle='modal' data-target='#logoutModal'>注销 ["
								+ folderView.account
								+ "] <span class='glyphicon glyphicon-off' aria-hidden='true'></span></button>");
		$("#tb2")
				.append(
						"<button class='btn btn-link' data-toggle='modal' data-target='#logoutModal'>注销 ["
								+ folderView.account
								+ "] <span class='glyphicon glyphicon-off' aria-hidden='true'></span></button>");
		if (folderView.allowChangePassword == 'true') {
			$("#tb")
					.append(
							" <button class='btn btn-link rightbtn hidden-xs' data-toggle='modal' data-target='#changePasswordModal'>修改密码 <span class='glyphicon glyphicon-edit' aria-hidden='true'></span></button>");
			$("#tb2")
					.append(
							" <button class='btn btn-link' data-toggle='modal' data-target='#changePasswordModal'>修改密码 <span class='glyphicon glyphicon-edit' aria-hidden='true'></span></button>");
		}
	} else {
		// 说明用户未登录，显示登录按钮
		$("#tb")
				.append(
						"<button class='btn btn-link rightbtn hidden-xs' data-toggle='modal' data-target='#loginModal'>登入 <span class='glyphicon glyphicon-user' aria-hidden='true'></span></button>");
		$("#tb2")
				.append(
						"<button class='btn btn-link' data-toggle='modal' data-target='#loginModal'>登入 <span class='glyphicon glyphicon-user' aria-hidden='true'></span></button>");
		if (folderView.allowSignUp == 'true') {
			$("#tb")
					.append(
							" <button class='btn btn-link rightbtn hidden-xs' onclick='window.location.href = \"/prv/signup.html\"'>立即注册 <span class='glyphicon glyphicon-log-in' aria-hidden='true'></span></button>");
			$("#tb2")
					.append(
							" <button class='btn btn-link' onclick='window.location.href = \"prv/signup.html\"'>立即注册 <span class='glyphicon glyphicon-log-in' aria-hidden='true'></span></button>");
		}
	}
	var authList = folderView.authList;
	// 对操作菜单进行初始化，根据权限显示可操作的按钮（并非约束）。
	$("#fileListDropDown li").addClass("disabled");
	$("#fileListDropDown li a").attr("onclick", "");
	if (authList != null) {
		if (checkAuth(authList, "C")) {
			$("#createFolderButtonLi").removeClass("disabled");
			$("#createFolderButtonLi a")
					.attr("onclick", "showNewFolderModel()");
		}
		if (checkAuth(authList, "U")) {
			$("#uploadFileButtonLi").removeClass("disabled");
			$("#uploadFileButtonLi a").attr("onclick", "showUploadFileModel()");
			if (checkAuth(authList, "C") && isSupportWebkitdirectory()) {// 若浏览器支持文件夹选择，且具备新建文件夹权限，则允许进行文件夹上传
				$("#uploadFolderButtonLi").removeClass("disabled");
				$("#uploadFolderButtonLi a").attr("onclick",
						"showUploadFolderModel()");
			}
		}
		if (folderView.enableDownloadZip && checkAuth(authList, "L")) {
			$("#packageDownloadBox")
					.html(
							"<button class='btn btn-link navbar-btn' onclick='showDownloadAllCheckedModel()'><span class='glyphicon glyphicon-briefcase'></span> 打包下载</button>");
		} else {
			$("#packageDownloadBox").html("");
		}
		if (checkAuth(authList, "D")) {
			$("#deleteSeelectFileButtonLi").removeClass("disabled");
			$("#deleteSeelectFileButtonLi a").attr("onclick",
					"showDeleteAllCheckedModel()");
		}
		if (checkAuth(authList, "M")) {
			$("#cutFileButtonLi").removeClass("disabled");
			$("#stickFileButtonLi").removeClass("disabled");
			$("#copyFileButtonLi").removeClass("disabled");
			$("#cutFileButtonLi a").attr("onclick", "cutFile()");
			$("#copyFileButtonLi a").attr("onclick", "copyFile()");
			$("#stickFileButtonLi a").attr("onclick", "stickFile()");
			if (checkedMovefiles !== undefined && checkedMovefiles.size > 0) {
				if (checkedMovefiles.size < 100) {
					$("#stickFilesCount").text(
							"（" + checkedMovefiles.size + "）");
				} else {
					$("#stickFilesCount").text("（99+）");
				}
				$("#copyFileButtonLi").removeClass("show");
				$("#copyFileButtonLi").addClass("hidden");
				$("#cutFileButtonLi").removeClass("show");
				$("#cutFileButtonLi").addClass("hidden");
				$("#stickFileButtonLi").removeClass("hidden");
				$("#stickFileButtonLi").addClass("show");
			} else {
				$("#copyFileButtonLi").removeClass("hidden");
				$("#copyFileButtonLi").addClass("show");
				$("#cutFileButtonLi").removeClass("hidden");
				$("#cutFileButtonLi").addClass("show");
				$("#stickFileButtonLi").removeClass("show");
				$("#stickFileButtonLi").addClass("hidden");
				$("#stickFilesCount").text("");
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
	subscribeNotice();// 刷新时也判断是否有新公告需要显示
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
						"<tr onclick='returnPF()'><td><button onclick='' class='btn btn-link btn-xs'>../</button></td><td class='hidden-xs'>--</td><td>--</td><td class='hidden-xs'>--</td><td>--</td></tr>");
	}
	var authList = folderView.authList;
	var aD = false;
	var aR = false;
	var aL = false;
	var aO = false;
	if (checkAuth(authList, "D")) {
		aD = true;
	}
	if (checkAuth(authList, "R")) {
		aR = true;
	}
	if (checkAuth(authList, "L")) {
		aL = true;
	}
	if (checkAuth(authList, "O")) {
		aO = true;
	}
	// 遍历并倒序显示文件夹列表
	for (var i1 = folderView.folderList.length; i1 > 0; i1--) {
		var f = folderView.folderList[i1 - 1];
		$("#foldertable").append(createNewFolderRow(f, aD, aR, aO));
	}
	// 遍历并倒序显示文件列表
	for (var i2 = folderView.fileList.length; i2 > 0; i2--) {
		var fi = folderView.fileList[i2 - 1];
		$("#foldertable").append(createFileRow(fi, aL, aD, aR, aO));
	}
}

// 根据一个文件对象生成对应的文件行的HTML内容
function createFileRow(fi, aL, aD, aR, aO) {
	fi.fileName = fi.fileName.replace(/\'/g, '&#39;').replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	var fileRow = "<tr id=" + fi.fileId + " onclick='checkfile(event," + '"'
			+ fi.fileId + '"' + ")' ondblclick='checkConsFile(event," + '"'
			+ fi.fileId + '"' + ")' id='" + fi.fileId
			+ "' class='filerow'><td>" + fi.fileName
			+ "</td><td class='hidden-xs'>" + fi.fileCreationDate + "</td>";
	if (fi.fileSize == "0") {
		fileRow = fileRow + "<td>&lt;1MB</td>";
	} else {
		fileRow = fileRow + "<td>" + fi.fileSize + "MB</td>";
	}
	fileRow = fileRow + "<td class='hidden-xs'>" + fi.fileCreator + "</td><td>";
	if (aL) {
		fileRow = fileRow
				+ "<button onclick='showDownloadModel("
				+ '"'
				+ fi.fileId
				+ '","'
				+ replaceAllQuotationMarks(fi.fileName)
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-cloud-download'></span> 下载</button>";
		// 对于各种特殊格式文件提供的预览和播放功能
		var suffix = getSuffix(fi.fileName);
		switch (suffix) {
		case "mp4":
			fileRow = fileRow
					+ "<button onclick='playVideo("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-play'></span> 播放</button>";
			break;
		case "webm":
		case "mov":
		case "avi":
		case "wmv":
		case "mkv":
		case "flv":
			if (folderView.enableFFMPEG) {
				fileRow = fileRow
						+ "<button onclick='playVideo("
						+ '"'
						+ fi.fileId
						+ '"'
						+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-play'></span> 播放</button>";
			}
			break;
		case "pdf":
			fileRow = fileRow
					+ "<button onclick='pdfView("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-eye-open'></span> 预览</button>";
			break;
		case "jpg":
		case "jpeg":
		case "gif":
		case "png":
		case "bmp":
			fileRow = fileRow
					+ "<button onclick='showPicture("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-picture'></span> 查看</button>";
			break;
		case "mp3":
		case "wav":
		case "ogg":
			fileRow = fileRow
					+ "<button onclick='playAudio("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-play'></span> 播放</button>";
			break;
		case "docx":
			fileRow = fileRow
					+ "<button onclick='docxView("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-eye-open'></span> 预览</button>";
			break;
		case "txt":
			fileRow = fileRow
					+ "<button onclick='txtView("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-eye-open'></span> 预览</button>";
			break;
		case "ppt":
		case "pptx":
			fileRow = fileRow
					+ "<button onclick='pptView("
					+ '"'
					+ fi.fileId
					+ '"'
					+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-eye-open'></span> 预览</button>";
			break;
		default:
			break;
		}
	}
	if (aD) {
		fileRow = fileRow
				+ "<button onclick='showDeleteFileModel("
				+ '"'
				+ fi.fileId
				+ '","'
				+ replaceAllQuotationMarks(fi.fileName)
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
				+ replaceAllQuotationMarks(fi.fileName)
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-wrench'></span> 重命名</button>";
	}
	if (aO) {
		fileRow = fileRow
				+ "<button onclick='showFolderView("
				+ '"'
				+ fi.fileParentFolder
				+ '","'
				+ fi.fileId
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-sunglasses'></span> 定位</button>";
	}
	if (aL && folderView.showFileChain == 'true') {
		fileRow = fileRow
				+ "<button onclick='getFileChain("
				+ '"'
				+ fi.fileId
				+ '","'
				+ replaceAllQuotationMarks(fi.fileName)
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-link'></span> 链接</button>";
	}
	if (!aR && !aD && !aL && !aO) {
		fileRow = fileRow + "--";
	}
	fileRow = fileRow + "</td></tr>";
	return fileRow;
}

// 根据一个文件夹对象生成对应的文件行的HTML内容
function createNewFolderRow(f, aD, aR, aO) {
	f.folderName = f.folderName.replace(/\'/g, '&#39;').replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	var folderRow = "<tr id='"
			+ f.folderId
			+ "' onclick='checkfile(event,"
			+ '"'
			+ f.folderId
			+ '"'
			+ ")' ondblclick='checkConsFile(event,"
			+ '"'
			+ f.folderId
			+ '"'
			+ ")' class='filerow' iskfolder='true' ><td><button onclick='entryFolder("
			+ '"' + f.folderId + '"' + ")' class='btn btn-link btn-xs'>/"
			+ f.folderName + "</button></td><td class='hidden-xs'>"
			+ f.folderCreationDate + "</td><td>--</td><td class='hidden-xs'>"
			+ f.folderCreator + "</td><td>";
	if (aD) {
		folderRow = folderRow
				+ "<button onclick='showDeleteFolderModel("
				+ '"'
				+ f.folderId
				+ '","'
				+ replaceAllQuotationMarks(f.folderName)
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-remove'></span> 删除</button>";
	}
	if (aR) {
		folderRow = folderRow
				+ "<button onclick='showRenameFolderModel("
				+ '"'
				+ f.folderId
				+ '","'
				+ replaceAllQuotationMarks(f.folderName)
				+ '",'
				+ f.folderConstraint
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-wrench'></span> 编辑</button>";
	}
	if (aO) {
		folderRow = folderRow
				+ "<button onclick='showFolderView("
				+ '"'
				+ f.folderParent
				+ '","'
				+ f.folderId
				+ '"'
				+ ")' class='btn btn-link btn-xs'><span class='glyphicon glyphicon-sunglasses'></span> 定位</button>";
	}
	if (!aR && !aD && !aO) {
		folderRow = folderRow + "--";
	}
	folderRow = folderRow + "</td></tr>";
	return folderRow;
}

var folderTypes = [ '公开的', '仅小组', '仅创建者' ];// 文件夹约束条件（由小至大）

// 显示新建文件夹模态框
function showNewFolderModel() {
	$('#newFolderModal').modal('show');
}

// 修改新建文件夹约束等级
function changeNewFolderType(type) {
	$("#newfoldertype").text(folderTypes[type]);
	$("#foldername").attr("folderConstraintLevel", type + "");
}

// 创建新的文件夹
function createfolder() {
	var fn = $("#foldername").val();
	var fc = $("#foldername").attr("folderConstraintLevel");
	var reg = new RegExp("[\/\|\\\\\*\\<\\>\\?\\:\\&\\$" + '"' + "]+", "g");
	if (fn.length == 0) {
		showFolderAlert("提示：文件夹名称不能为空。");
	} else if (fn.length > 128) {
		showFolderAlert("提示：文件夹名称太长。");
	} else if (!reg.test(fn) && fn.indexOf(".") != 0) {
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
					window.location.href = "prv/login.html";
				} else {
					switch (result) {
					case "noAuthorized":
						showFolderAlert("提示：您的操作未被授权，创建文件夹失败。");
						break;
					case "errorParameter":
						showFolderAlert("提示：参数不正确，创建文件夹失败。");
						break;
					case "cannotCreateFolder":
						showFolderAlert("提示：出现意外错误，可能未能创建文件夹。");
						break;
					case "nameOccupied":
						showFolderAlert("提示：该名称已被占用，请选取其他名称。");
						break;
					case "foldersTotalOutOfLimit":
						showFolderAlert("提示：该文件夹内存储的文件夹数量已达上限，无法在其中创建更多文件夹。");
						break;
					case "createFolderSuccess":
						$('#newFolderModal').modal('hide');
						showFolderView(locationpath);
						break;
					default:
						showFolderAlert("提示：出现意外错误，可能未能创建文件夹。");
						break;
					}
				}
			},
			error : function() {
				showFolderAlert("提示：出现意外错误，可能未能创建文件夹");
			}
		});
	} else {
		showFolderAlert("提示：文件夹名中不应含有：引号 / \\ * | < > & $ : ? 且不能以“.”开头。");
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
	$("#cancelDeleteFolderBtn").attr('disabled', false);
	$('#deleteFolderMessage').text(
			"提示：确定要彻底删除文件夹：[" + folderName + "]及其全部内容么？该操作不可恢复");
	$('#deleteFolderModal').modal('toggle');
}

// 执行删除文件夹
function deleteFolder(folderId) {
	$("#dmbutton").attr('disabled', true);
	$("#cancelDeleteFolderBtn").attr('disabled', true);
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
				window.location.href = "prv/login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFolderMessage').text("提示：您的操作未被授权，删除文件夹失败");
					$("#dmbutton").attr('disabled', false);
					$("#cancelDeleteFolderBtn").attr('disabled', true);
				} else if (result == "errorParameter") {
					$('#deleteFolderMessage').text("提示：参数不正确，删除文件夹失败");
					$("#dmbutton").attr('disabled', false);
					$("#cancelDeleteFolderBtn").attr('disabled', true);
				} else if (result == "cannotDeleteFolder") {
					$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
					$("#dmbutton").attr('disabled', false);
					$("#cancelDeleteFolderBtn").attr('disabled', true);
				} else if (result == "deleteFolderSuccess") {
					$('#deleteFolderModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
					$("#dmbutton").attr('disabled', false);
					$("#cancelDeleteFolderBtn").attr('disabled', true);
				}
			}
		},
		error : function() {
			$('#deleteFolderMessage').text("提示：出现意外错误，可能未能删除文件夹");
			$("#dmbutton").attr('disabled', false);
			$("#cancelDeleteFolderBtn").attr('disabled', true);
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
function changeEditFolderType(type) {
	$("#editfoldertype").text(folderTypes[type]);
	$("#newfoldername").attr("folderConstraintLevel", type + "");
}

// 执行重命名文件夹
function renameFolder(folderId) {
	var newName = $("#newfoldername").val();
	var fc = $("#newfoldername").attr("folderConstraintLevel");
	var reg = new RegExp("[\/\|\\\\\*\\<\\>\\?\\:\\&\\$" + '"' + "]+", "g");
	if (newName.length == 0) {
		showRFolderAlert("提示：文件夹名称不能为空。");
	} else if (newName.length > 128) {
		showRFolderAlert("提示：文件夹名称太长。");
	} else if (!reg.test(newName) && newName.indexOf(".") != 0) {
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
					window.location.href = "prv/login.html";
				} else {
					if (result == "noAuthorized") {
						showRFolderAlert("提示：您的操作未被授权，编辑失败。");
					} else if (result == "errorParameter") {
						showRFolderAlert("提示：参数不正确，编辑失败，请刷新后重试。");
					} else if (result == "nameOccupied") {
						showRFolderAlert("提示：该名称已被占用，请选取其他名称。");
					} else if (result == "renameFolderSuccess") {
						$('#renameFolderModal').modal('hide');
						showFolderView(locationpath);
					} else {
						showRFolderAlert("提示：出现意外错误，可能未能编辑文件夹，请刷新后重试。");
					}
				}
			},
			error : function() {
				showRFolderAlert("提示：出现意外错误，可能未能编辑文件夹，请刷新后重试。");
			}
		});
	} else {
		showRFolderAlert("提示：文件夹名中不应含有：引号 / \\ * | < > & $ : ? 且不能以“.”开头。");
	}
}

// 显示重命名文件夹状态提示
function showRFolderAlert(txt) {
	$("#editfolderalert").addClass("alert");
	$("#editfolderalert").addClass("alert-danger");
	$("#folderrenamebox").addClass("has-error");
	$("#editfolderalert").text(txt);
}

// 显示上传文件模态框
function showUploadFileModel() {
	$("#uploadFileAlert").hide();
	$("#uploadFileAlert").text("");
	if (isUpLoading == false) {
		$("#filepath").removeAttr("disabled");
		$("#uploadfile").val("");
		$("#filepath").val("");
		$("#pros").width("0%");
		$("#pros").attr('aria-valuenow', '0');
		$("#umbutton").attr('disabled', false);
		$("#filecount").text("");
		$("#uploadstatus").html("");
		$("#selectcount").text("");
		$("#selectFileUpLoadModelAsAll").removeAttr("checked");
		$("#selectFileUpLoadModelAlert").hide();
	}
	$('#uploadFileModal').modal('show');
}

// 点击文本框触发input:file选择文件动作
function checkpath() {
	$('#uploadfile').click();
}

// 获取选中文件
function getInputUpload() {
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

// 检查文件是否能够上传
function checkUploadFile() {
	if (isUpLoading == false && isImporting == false) {
		if (fs != null && fs.length > 0) {
			$("#filepath").attr("disabled", "disabled");
			$("#umbutton").attr('disabled', true);
			isUpLoading = true;
			repeModelList = null;
			$("#uploadFileAlert").hide();
			$("#uploadFileAlert").text("");
			var filenames = new Array();
			var maxSize = 0;
			var maxFileIndex = 0;
			for (var i = 0; i < fs.length; i++) {
				filenames[i] = fs[i].name;
				if (fs[i].size > maxSize) {
					maxSize = fs[i].size;
					maxFileIndex = i;
				}
			}
			var namelist = JSON.stringify(filenames);

			$
					.ajax({
						type : "POST",
						dataType : "text",
						data : {
							folderId : locationpath,
							namelist : namelist,
							maxSize : maxSize,
							maxFileIndex : maxFileIndex
						},
						url : "homeController/checkUploadFile.ajax",
						success : function(result) {
							if (result == "mustLogin") {
								window.location.href = "prv/login.html";
							} else {
								switch (result) {
								case "errorParameter":
									showUploadFileAlert("提示：参数不正确，无法开始上传");
									break;
								case "noAuthorized":
									showUploadFileAlert("提示：您的操作未被授权，无法开始上传");
									break;
								case "filesTotalOutOfLimit":
									showUploadFileAlert("提示：该文件夹内存储的文件数量已达上限，无法在其中上传更多文件。您可以尝试将其上传至其他文件夹内。");
									break;
								default:
									var resp = eval("(" + result + ")");
									if (resp.checkResult == "fileTooLarge") {
										showUploadFileAlert("提示：文件["
												+ resp.overSizeFile
												+ "]的体积超过最大限制（"
												+ resp.maxUploadFileSize
												+ "），无法开始上传");
									} else if (resp.checkResult == "hasExistsNames") {
										repeList = resp.pereFileNameList;
										repeIndex = 0;
										selectFileUpLoadModelStart();
									} else if (resp.checkResult == "permitUpload") {
										doupload(1);
									} else {
										showUploadFileAlert("提示：出现意外错误，无法开始上传");
									}
									break;
								}
							}
						},
						error : function() {
							showUploadFileAlert("提示：出现意外错误，无法开始上传");
						}
					});
		} else {
			showUploadFileAlert("提示：您未选择任何文件，无法开始上传");
		}
	} else {
		showUploadFileAlert("提示：另一项上传文件或文件夹的任务尚未完成，无法开始上传");
	}
}

var repeList;// 这个是重复文件名的列表，型如['xxx','ooo',...]
var repeIndex;// 当前设定上传模式的文件序号
var repeModelList;// 这个是对每一个重复文件选取的上传模式，型如{'xxx':'skip','ooo':'both',...}

// 针对同名文件，选择上传的模式：跳过（skip）、覆盖（cover）和保留两者（both）
function selectFileUpLoadModelStart() {
	var authList = originFolderView.authList;
	if (checkAuth(authList, "D")) {
		$("#uploadcoverbtn").show();
	} else {
		$("#uploadcoverbtn").hide();
	}
	$("#selectFileUpLoadModelAlert").show();
	$("#repeFileName").text(repeList[repeIndex]);
}

// 设定重名文件的处理方法
function selectFileUpLoadModelEnd(t) {
	if (repeModelList == null) {
		repeModelList = {};
	}
	repeModelList[$("#repeFileName").text()] = t;
	$("#selectFileUpLoadModelAlert").hide();
	if ($('#selectFileUpLoadModelAsAll').prop('checked')) {
		for (var i = repeIndex; i < repeList.length; i++) {
			repeModelList[repeList[i]] = t;
		}
		doupload(1);
	} else {
		repeIndex++;
		if (repeIndex < repeList.length) {
			selectFileUpLoadModelStart();
		} else {
			doupload(1);
		}
	}
}

// 执行文件上传并实现上传进度显示
function doupload(count) {
	var fcount = fs.length;
	$("#pros").width("0%");// 先将进度条置0
	$("#pros").attr('aria-valuenow', "0");
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
		fd.append("fname", fname);
		fd.append("folderId", locationpath);
		if (repeModelList != null && repeModelList[fname] != null) {
			if (repeModelList[fname] == 'skip') {
				$("#uls_" + count).text("[已完成]");
				if (count < fcount) {
					doupload(count + 1);
					return;
				} else {
					// 清空所有提示信息，还原上传窗口
					isUpLoading = false;
					$("#filepath").removeAttr("disabled");
					$("#uploadfile").val("");
					$("#filepath").val("");
					$("#pros").width("0%");
					$("#pros").attr('aria-valuenow', "0");
					$("#umbutton").attr('disabled', false);
					$("#filecount").text("");
					$("#uploadstatus").text("");
					$("#selectcount").text("");
					$('#uploadFileModal').modal('hide');
					showFolderView(locationpath);
					return;
				}
			}
			fd.append("repeType", repeModelList[fname]);
		}
		xhr.open("POST", "homeController/douploadFile.ajax", true);// 上传目标

		xhr.upload.addEventListener("progress", uploadProgress, false);// 这个是对上传进度的监听
		// 上面的三个参数分别是：事件名（指定名称）、回调函数、是否冒泡（一般是false即可）

		xhr.send(fd);// 上传FormData对象

		if (pingInt == null) {
			pingInt = setInterval("ping()", 60000);// 上传中开始计时应答
		}

		// 上传结束后执行的回调函数
		xhr.onloadend = function() {
			// 停止应答计时
			if (pingInt != null) {
				window.clearInterval(pingInt);
				pingInt = null;
			}
			if (xhr.status === 200) {
				// TODO 上传成功
				var result = xhr.responseText;
				if (result == "uploadsuccess") {
					$("#uls_" + count).text("[已完成]");
					if (count < fcount) {
						doupload(count + 1);
					} else {
						// 清空所有提示信息，还原上传窗口
						isUpLoading = false;
						$("#filepath").removeAttr("disabled");
						$("#uploadfile").val("");
						$("#filepath").val("");
						$("#pros").width("0%");
						$("#pros").attr('aria-valuenow', "0");
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
				} else if (result == 'filesTotalOutOfLimit') {
					showUploadFileAlert("提示：该文件夹内存储的文件数量已达上限，文件：[" + fname
							+ "]上传失败。您可以尝试将其上传至其他文件夹内。");
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

// 显示上传文件进度
function uploadProgress(evt) {
	if (evt.lengthComputable) {
		// evt.loaded：文件上传的大小 evt.total：文件总的大小
		var percentComplete = Math.round((evt.loaded) * 100 / evt.total);
		// 加载进度条，同时显示信息
		$("#pros").width(percentComplete + "%");
		$("#pros").attr('aria-valuenow', "" + percentComplete);
	}
}

// 显示上传文件错误提示
function showUploadFileAlert(txt) {
	isUpLoading = false;
	$("#filepath").removeAttr("disabled");
	$("#uploadFileAlert").show();
	$("#uploadFileAlert").text(txt);
	$("#umbutton").attr('disabled', false);
}

// 取消上传文件
function abortUpload() {
	if (isUpLoading) {
		isUpLoading = false;
		if (xhr != null) {
			xhr.abort();
		}
	}
	$('#uploadFileModal').modal('hide');
	showFolderView(locationpath);
}

// 显示下载文件模态框
function showDownloadModel(fileId, fileName) {
	$("#downloadFileName").text("提示：您确认要下载文件：[" + fileName + "]么？");
	$("#downloadHrefBox").html("<span class='text-muted'>正在生成...</span>");
	getDownloadFileId = fileId;
	getDownloadFileName = fileName;
	$("#downloadFileBox")
			.html(
					"<button id='dlmbutton' type='button' class='btn btn-primary' onclick='dodownload("
							+ '"' + fileId + '"' + ")'>开始下载</button>");
	$("#dlmbutton").attr('disabled', false);
	$("#downloadModal").modal('show');
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
	$("#cancelDeleteFileBox").attr('disabled', false);
	$('#deleteFileMessage').text("提示：确定要彻底删除文件：[" + fileName + "]么？该操作不可恢复");
	$('#deleteFileModal').modal('toggle');
}

// 执行删除文件操作
function deleteFile(fileId) {
	$("#dfmbutton").attr('disabled', true);
	$("#cancelDeleteFileBox").attr('disabled', true);
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
				window.location.href = "prv/login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFileMessage').text("提示：您的操作未被授权，删除失败");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#deleteFileMessage').text("提示：参数不正确，删除失败");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "cannotDeleteFile") {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "deleteFileSuccess") {
					$('#deleteFileModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除文件");
			$("#dfmbutton").attr('disabled', false);
			$("#cancelDeleteFileBox").attr('disabled', false);
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
	var reg = new RegExp("[\/\|\\\\\*\\<\\>\\?\\:\\&\\$" + '"' + "]+", "g");
	var newFileName = $("#newfilename").val();
	if (newFileName.length > 0) {
		if (newFileName.length < 128) {
			if (!reg.test(newFileName) && newFileName.indexOf(".") != 0) {
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
							window.location.href = "prv/login.html";
						} else {
							if (result == "cannotRenameFile") {
								showRFileAlert("提示：出现意外错误，可能未能重命名文件，请刷新后重试。");
							} else if (result == "renameFileSuccess") {
								$('#renameFileModal').modal('hide');
								showFolderView(locationpath);
							} else if (result == "errorParameter") {
								showRFileAlert("提示：参数错误，重命名失败，请刷新后重试。");
							} else if (result == "nameOccupied") {
								showRFileAlert("提示：该名称已被占用，请选取其他名称。");
							} else if (result == "noAuthorized") {
								showRFileAlert("提示：您的操作未被授权，重命名失败，请刷新后重试。");
							} else {
								showRFileAlert("提示：出现意外错误，可能未能重命名文件，请刷新后重试。");
							}
						}
					},
					error : function() {
						showRFileAlert("提示：出现意外错误，可能未能重命名文件。");
					}
				});
			} else {
				showRFileAlert("提示：文件名中不应含有：引号 / \\ * | < > & $ : ? 且不能以“.”开头。");
			}
		} else {
			showRFileAlert("提示：文件名称太长。");
		}
	} else {
		showRFileAlert("提示：文件名不能为空。");
	}
}

// 显示重命名文件状态提示
function showRFileAlert(txt) {
	$("#newFileNamealert").addClass("alert");
	$("#newFileNamealert").addClass("alert-danger");
	$("#filerenamebox").addClass("has-error");
	$("#newFileNamealert").text(txt);
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
	window
			.open("/pdfview/web/viewer.html?file=/resourceController/getResource/"
					+ fileId);
}

// 预览Docx文档
function docxView(fileId) {
	window
			.open("/pdfview/web/viewer.html?file=/resourceController/getWordView/"
					+ fileId);
}

// 预览TXT文档
function txtView(fileId) {
	window.open("/pdfview/web/viewer.html?file=/resourceController/getTxtView/"
			+ fileId);
}

// 预览PPT文档
function pptView(fileId) {
	window.open("/pdfview/web/viewer.html?file=/resourceController/getPPTView/"
			+ fileId);
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
				pvl = eval("(" + result + ")");
				// TODO 整合viewer.js插件
				if (pvl.pictureViewList.length <= viewerPageSize) {
					createViewList();// 以全列方式显示图片列表
				} else {
					// 以分页方式显示图片列表
					viewerPageIndex = Math.ceil((pvl.index + 1)
							/ viewerPageSize);
					viewerTotal = Math.ceil(pvl.pictureViewList.length
							/ viewerPageSize);
					createViewListByPage();
					var innerIndex = pvl.index
							- ((viewerPageIndex - 1) * viewerPageSize);
					if (viewerPageIndex > 1) {
						innerIndex++;
					}
					viewer.viewer('view', innerIndex);
					viewer.viewer('show', true);
				}
				// end
			} else {
				alert("错误：无法定位要预览的文件或该操作未被授权。");
			}
		},
		error : function() {
			alert("错误：请求失败，请刷新重试。");
		}
	});
}

// 用于创建并显示小于2*limit+1长度的图片列表
function createViewList() {
	if (viewer == null) {
		var images = document.createElement("ul");
		for (var i = 0; i < pvl.pictureViewList.length; i++) {
			$(images).append(
					"<li><img src='" + pvl.pictureViewList[i].url + "' alt='"
							+ pvl.pictureViewList[i].fileName + "' /></li>");
		}
		viewer = $(images);
		viewer.viewer({
			loop : false,
			hidden : function() {
				viewer.data('viewer').destroy();
				viewer = null;
			}
		});
	}
	viewer.viewer('view', pvl.index);
	viewer.viewer('show', true);
}

// 用于创建长于2*limit+1长度的图片分页列表
function createViewListByPage() {
	// 初始化分页结构
	if (viewer == null) {
		var images = document.createElement("ul");
		var startIndex = (viewerPageIndex - 1) * viewerPageSize;
		if (viewerPageIndex > 1) {
			$(images).append("<li><img src='css/left.png' alt='上一页' /></li>");
		}
		for (var i = 0; i < viewerPageSize
				&& i < (pvl.pictureViewList.length - (viewerPageIndex - 1)
						* viewerPageSize); i++) {
			$(images).append(
					"<li><img src='" + pvl.pictureViewList[startIndex + i].url
							+ "' alt='"
							+ pvl.pictureViewList[startIndex + i].fileName
							+ "' /></li>");
		}
		if (viewerPageIndex < viewerTotal) {
			$(images).append("<li><img src='css/right.png' alt='下一页' /></li>");
		}
		viewer = $(images);
		viewer
				.viewer({
					loop : false,
					view : function(event) {
						// 点击的计数为event.detail.index;
						if (event.detail.index == 0 && viewerPageIndex != 1) {
							viewerPageIndex--;
							viewer.data('viewer').destroy();
							viewer.empty();
							viewer = null;
							createViewListByPage();
							if (viewerPageIndex > 1) {
								viewer.viewer('view', viewerPageSize);
							} else {
								viewer.viewer('view', viewerPageSize - 1);
							}
						} else if (event.detail.index == viewerPageSize + 1
								|| (event.detail.index == viewerPageSize && viewerPageIndex == 1)) {
							viewerPageIndex++;
							viewer.data('viewer').destroy();
							viewer.empty();
							viewer = null;
							createViewListByPage();
							viewer.viewer('view', 1);
						}
					},
					hidden : function() {
						viewer.data('viewer').destroy();
						viewer.empty();
						viewer = null;
					}
				});
	}
}

// 兼容Chrome、IE、FF的Shift判定
function isShift(event) {
	var e = window.event || event;
	if (e.shiftKey) {
		return true;
	} else {
		return false;
	}
}

// 选中某一行文件，如果使用Shift点击则为多选
function checkfile(event, fileId) {
	if (!isShift(event)) {
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

// 连续选中若干行文件：Shift+双击，选中规则为：前有选前，后有选后，全有也选后。
function checkConsFile(event, fileId) {
	if (isShift(event)) {
		var endRow = $("#" + fileId);
		var endRowIndex = endRow.index();
		var startRowIndex = $('.filerow.info:last').index();
		if (startRowIndex != -1) {
			if (startRowIndex < endRowIndex) {
				while (endRow[0] && !endRow.hasClass("info")) {
					endRow.addClass("info");
					endRow = endRow.prev();
				}
			} else {
				while (endRow[0] && !endRow.hasClass("info")) {
					endRow.addClass("info");
					endRow = endRow.next();
				}
			}
		}
	}
}

// 用于获取全部选中的文件夹和文件ID，该function返回一个对象。
// 该对象中，filesId属性为文件ID，foldersId属性为文件夹ID。两个属性均为JSON数组形式的字符串，可直接发送至服务器。此外还有size，包含了元素的总数。
function getCheckedFilesAndFolders() {
	var filesAndFolders = new Object();
	filesAndFolders.size = 0;
	var filesId = new Array();
	var foldersId = new Array();
	var checkedfiles = $(".info").get();
	for (var i = 0; i < checkedfiles.length; i++) {
		if (checkedfiles[i].getAttribute("iskfolder") == "true") {
			foldersId.push(checkedfiles[i].id);
		} else {
			filesId.push(checkedfiles[i].id);
		}
		filesAndFolders.size++;
	}
	filesAndFolders.filesId = JSON.stringify(filesId);
	filesAndFolders.foldersId = JSON.stringify(foldersId);
	return filesAndFolders;
}

// 切换全部文件行的选中或非选中
function checkallfile() {
	if ($(".filerow.info").length == $(".filerow").length) {
		$(".filerow").removeClass("info");
	} else {
		$(".filerow").addClass("info");
	}
}

// 显示打包下载模态框
function showDownloadAllCheckedModel() {
	if (!folderView.enableDownloadZip) {
		return;
	}
	$("#downloadAllCheckedBox").html("");
	$("#downloadAllCheckedLoad").text("");
	var faf = getCheckedFilesAndFolders();
	if (faf.size == 0) {
		$("#downloadAllCheckedName").html(checkFilesTip);
	} else {
		$("#downloadAllCheckedName").text("提示：您确认要打包并下载这" + faf.size + "项么？");
		$("#downloadAllCheckedBox")
				.html(
						"<button id='dclmbutton' type='button' class='btn btn-primary' onclick='downloadAllChecked()'>开始下载</button>");
		$("#dclmbutton").attr('disabled', false);
	}
	$("#cancelDownloadAllCheckedBtn").attr('disabled', false);
	$("#downloadAllCheckedModal").modal('toggle');
}

// 下载选中的所有文件
function downloadAllChecked() {
	$("#dclmbutton").attr('disabled', true);
	$("#cancelDownloadAllCheckedBtn").attr('disabled', true);
	var faf = getCheckedFilesAndFolders();
	$("#downloadAllCheckedName").text(
			"提示：服务器正在对选中资源进行压缩（共" + faf.size
					+ "项），这可能需要一些时间（文件越大耗时越长），压缩完成将自动开始下载。");
	// 计算预计耗时
	$.ajax({
		url : 'homeController/getPackTime.ajax',
		type : 'POST',
		data : {
			strIdList : faf.filesId,
			strFidList : faf.foldersId
		},
		dataType : 'text',
		success : function(result) {
			if (result != "0") {
				var count = 0;
				$("#downloadAllCheckedLoad").text(
						"已耗时：" + count + "秒（预计耗时：" + result + "）");
				zipTimer = setInterval(function() {
					count++;
					$("#downloadAllCheckedLoad").text(
							"已耗时：" + count + "秒（预计耗时：" + result + "）");
				}, 1000);
			} else {
				var count = 0;
				$("#downloadAllCheckedLoad").text("已耗时：" + count + "秒");
				zipTimer = setInterval(function() {
					count++;
					$("#downloadAllCheckedLoad").text("已耗时：" + count + "秒");
				}, 1000);
			}
		},
		error : function() {
			$("#downloadAllCheckedLoad").text("（无法获取预计耗时）");
		}
	});
	// 同时发送压缩下载请求
	$.ajax({
		type : "POST",
		url : "homeController/downloadCheckedFiles.ajax",
		data : {
			strIdList : faf.filesId,
			strFidList : faf.foldersId
		},
		dataType : "text",
		success : function(result) {
			if (zipTimer != null) {
				window.clearInterval(zipTimer);
			}
			if (result == "ERROR") {
				$("#downloadAllCheckedName")
						.text("提示：压缩过程出错。无法完成压缩，请重试或告知管理员。");
				$("#dclmbutton").attr('disabled', false);
				$("#cancelDownloadAllCheckedBtn").attr('disabled', false);
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
			$("#dclmbutton").attr('disabled', false);
			$("#cancelDownloadAllCheckedBtn").attr('disabled', false);
		}
	});
}

// 删除选中的所有文件
function showDeleteAllCheckedModel() {
	$('#deleteFileBox').html("");
	var faf = getCheckedFilesAndFolders();
	$("#dfmbutton").attr('disabled', false);
	$("#cancelDeleteFileBox").attr('disabled', false);
	if (faf.size == 0) {
		$('#deleteFileMessage').html(checkFilesTip);
	} else {
		$('#deleteFileBox')
				.html(
						"<button id='dfmbutton' type='button' class='btn btn-danger' onclick='deleteAllChecked()'>全部删除</button>");
		$('#deleteFileMessage').text("提示：确定要彻底删除这" + faf.size + "项么？该操作不可恢复！");
	}
	$('#deleteFileModal').modal('toggle');
}

// 删除选中的所有文件
function deleteAllChecked() {
	// TODO 提交全部删除请求
	var faf = getCheckedFilesAndFolders();
	$("#dfmbutton").attr('disabled', true);
	$("#cancelDeleteFileBox").attr('disabled', true);
	$('#deleteFileMessage').text("提示：正在删除，请稍候...");
	$.ajax({
		type : "POST",
		dataType : "text",
		data : {
			strIdList : faf.filesId,
			strFidList : faf.foldersId
		},
		url : "homeController/deleteCheckedFiles.ajax",
		success : function(result) {
			if (result == "mustLogin") {
				window.location.href = "prv/login.html";
			} else {
				if (result == "noAuthorized") {
					$('#deleteFileMessage').text("提示：您的操作未被授权，删除失败");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "errorParameter") {
					$('#deleteFileMessage').text("提示：参数不正确，未能全部删除文件");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "cannotDeleteFile") {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				} else if (result == "deleteFileSuccess") {
					$('#deleteFileModal').modal('hide');
					showFolderView(locationpath);
				} else {
					$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
					$("#dfmbutton").attr('disabled', false);
					$("#cancelDeleteFileBox").attr('disabled', false);
				}
			}
		},
		error : function() {
			$('#deleteFileMessage').text("提示：出现意外错误，可能未能删除全部文件");
			$("#dfmbutton").attr('disabled', false);
			$("#cancelDeleteFileBox").attr('disabled', false);
		}
	});
}

// 播放音乐
function playAudio(fileId) {
	$('#audioPlayerModal').modal('show');
	if (pingInt == null) {
		pingInt = setInterval("ping()", 60000);// 播放中开始计时应答
	}
	if (ap == null) {
		ap = new APlayer({
			container : document.getElementById('aplayer'),
			lrcType : 3,
			mutex : true,
			volume : 0.7,
			theme : '#EDEDED',
			audio : []
		});
		ap
				.on(
						'pause',
						function() {
							$("#playOrPause")
									.html(
											"<span class='glyphicon glyphicon-play' aria-hidden='true'></span>");
						});
		ap
				.on(
						'play',
						function() {
							$("#playOrPause")
									.html(
											"<span class='glyphicon glyphicon-pause' aria-hidden='true'></span>");
						});
	}
	ap.list.clear();
	$.ajax({
		url : 'homeController/playAudios.ajax',
		data : {
			fileId : fileId
		},
		type : 'POST',
		dataType : 'text',
		success : function(result) {
			var ail = eval("(" + result + ")");
			// 避免存在恶意标签注入在文件名中
			for (var i = ail.index; i < ail.as.length; i++) {
				ail.as[i].name = ail.as[i].name.replace('\'', '&#39;').replace(
						'<', '&lt;').replace('>', '&gt;');
				ap.list.add(ail.as[i]);
			}
			for (var i = 0; i < ail.index; i++) {
				ail.as[i].name = ail.as[i].name.replace('\'', '&#39;').replace(
						'<', '&lt;').replace('>', '&gt;');
				ap.list.add(ail.as[i]);
			}
			audio_play();
		},
		error : function() {
			alert("错误：无法获取音乐列表，请稍后再试");
			closeAudioPlayer();
		}
	});
}

// 关闭音乐播放器
function closeAudioPlayer() {
	$('#audioPlayerModal').modal('hide');
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
function audio_vulome_up() {
	ap.volume(ap.audio.volume + 0.1, true);
}

// 音量减少，每次10%
function audio_vulome_down() {
	ap.volume(ap.audio.volume - 0.1, true);
}

// 按文件名排序
function sortbyfn() {
	if (!loadingComplete) {
		return;
	}
	if ($("#sortByCD,#sortByFS,#sortByCN,#sortByOR").hasClass(
			"glyphicon glyphicon-hourglass")) {
		return;
	}
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	$("#sortByOR").removeClass();
	var order = 1;
	if ($("#sortByFN").hasClass('glyphicon-triangle-bottom')) {
		order = -1;
	}
	$("#sortByFN").removeClass();
	$("#sortByFN").addClass("glyphicon glyphicon-hourglass");
	// 另开一个计时器进行排序操作，避免因卡死导致加载动画无法显示
	setTimeout(function() {
		folderView.fileList.sort(function(v1, v2) {
			return order * v2.fileName.localeCompare(v1.fileName, "zh");
		});
		folderView.folderList.sort(function(v1, v2) {
			return order * v2.folderName.localeCompare(v1.folderName, "zh");
		});
		showFolderTable(folderView);
		$("#sortByFN").removeClass();
		if (order == -1) {
			$("#sortByFN").addClass("glyphicon glyphicon-triangle-top");
		} else {
			$("#sortByFN").addClass("glyphicon glyphicon-triangle-bottom");
		}
	}, 0);
}

// 按创建日期排序
function sortbycd() {
	if (!loadingComplete) {
		return;
	}
	if ($("#sortByFN,#sortByFS,#sortByCN,#sortByOR").hasClass(
			"glyphicon glyphicon-hourglass")) {
		return;
	}
	$("#sortByFN").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	$("#sortByOR").removeClass();
	var order = 1;
	if ($("#sortByCD").hasClass('glyphicon-triangle-bottom')) {
		order = -1;
	}
	$("#sortByCD").removeClass();
	$("#sortByCD").addClass("glyphicon glyphicon-hourglass");
	setTimeout(function() {
		folderView.fileList.sort(function(v1, v2) {
			var v1DateStr = v1.fileCreationDate.replace("年", "-").replace("月",
					"-").replace("日", "");
			var v2DateStr = v2.fileCreationDate.replace("年", "-").replace("月",
					"-").replace("日", "");
			var res = ((new Date(Date.parse(v1DateStr)).getTime()) - (new Date(
					Date.parse(v2DateStr)).getTime()));
			return order * res;
		});
		folderView.folderList.sort(function(v1, v2) {
			var v1DateStr = v1.folderCreationDate.replace("年", "-").replace(
					"月", "-").replace("日", "");
			var v2DateStr = v2.folderCreationDate.replace("年", "-").replace(
					"月", "-").replace("日", "");
			var res = ((new Date(Date.parse(v1DateStr)).getTime()) - (new Date(
					Date.parse(v2DateStr)).getTime()));
			return order * res;
		});
		showFolderTable(folderView);
		$("#sortByCD").removeClass();
		if (order == -1) {
			$("#sortByCD").addClass("glyphicon glyphicon-triangle-top");
		} else {
			$("#sortByCD").addClass("glyphicon glyphicon-triangle-bottom");
		}
	}, 0);
}

// 按文件大小排序
function sortbyfs() {
	if (!loadingComplete) {
		return;
	}
	if ($("#sortByFN,#sortByCD,#sortByCN,#sortByOR").hasClass(
			"glyphicon glyphicon-hourglass")) {
		return;
	}
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByCN").removeClass();
	$("#sortByOR").removeClass();
	var order = 1;
	if ($("#sortByFS").hasClass("glyphicon-triangle-bottom")) {
		order = -1;
	}
	$("#sortByFS").removeClass();
	$("#sortByFS").addClass("glyphicon glyphicon-hourglass");
	setTimeout(function() {
		folderView.fileList.sort(function(v1, v2) {
			return order * (v1.fileSize - v2.fileSize);
		});
		showFolderTable(folderView);
		$("#sortByFS").removeClass();
		if (order == -1) {
			$("#sortByFS").addClass("glyphicon glyphicon-triangle-top");
		} else {
			$("#sortByFS").addClass("glyphicon glyphicon-triangle-bottom");
		}
	}, 0);
}

// 按创建者排序
function sortbycn() {
	if (!loadingComplete) {
		return;
	}
	if ($("#sortByFN,#sortByCD,#sortByFS,#sortByOR").hasClass(
			"glyphicon glyphicon-hourglass")) {
		return;
	}
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByOR").removeClass();
	var order = 1;
	if ($("#sortByCN").hasClass('glyphicon-triangle-bottom')) {
		order = -1;
	}
	$("#sortByCN").removeClass();
	$("#sortByCN").addClass("glyphicon glyphicon-hourglass");
	setTimeout(function() {
		folderView.fileList.sort(function(v1, v2) {
			return order * v2.fileCreator.localeCompare(v1.fileCreator, "zh");
		});
		folderView.folderList.sort(function(v1, v2) {
			return order
					* v2.folderCreator.localeCompare(v1.folderCreator, "zh");
		});
		showFolderTable(folderView);
		$("#sortByCN").removeClass();
		if (order == -1) {
			$("#sortByCN").addClass("glyphicon glyphicon-triangle-top");
		} else {
			$("#sortByCN").addClass("glyphicon glyphicon-triangle-bottom");
		}
	}, 0);
}

// 显示原始的顺序
function showOriginFolderView() {
	if (!loadingComplete) {
		return;
	}
	if ($("#sortByFN,#sortByCD,#sortByFS,#sortByCN").hasClass(
			"glyphicon glyphicon-hourglass")) {
		return;
	}
	$("#sortByFN").removeClass();
	$("#sortByCD").removeClass();
	$("#sortByFS").removeClass();
	$("#sortByCN").removeClass();
	$("#sortByOR").addClass("glyphicon glyphicon-hourglass");
	setTimeout(function() {
		if (screenedFoldrView != null) {
			folderView = $.extend(true, {}, screenedFoldrView);
		} else {
			folderView = $.extend(true, {}, originFolderView);
		}
		showFolderTable(folderView);
		$("#sortByOR").removeClass();
	}, 0);
}

// 执行“剪切”操作
function cutFile() {
	checkedMovefiles = getCheckedFilesAndFolders();
	if (checkedMovefiles == undefined || checkedMovefiles.size == 0) {
		// 如果未选中任何文件，则提示用户要先选
		$('#moveFilesMessage').html(checkFilesTip);
		$("#selectFileMoveModelAsAll").removeAttr("checked");
		$("#selectFileMoveModelAlert").hide();
		$('#moveFilesModal').modal('show');
	} else {
		// 否则，隐藏“剪切”和“复制”按钮，显示“粘贴”按钮
		if (checkedMovefiles.size < 100) {
			$("#stickFilesCount").text("（" + checkedMovefiles.size + "）");
		} else {
			$("#stickFilesCount").text("（99+）");
		}
		$("#copyFileButtonLi").removeClass("show");
		$("#copyFileButtonLi").addClass("hidden");
		$("#cutFileButtonLi").removeClass("show");
		$("#cutFileButtonLi").addClass("hidden");
		$("#stickFileButtonLi").removeClass("hidden");
		$("#stickFileButtonLi").addClass("show");
		isCopy = false;
	}
}

// 执行“复制”操作
function copyFile() {
	checkedMovefiles = getCheckedFilesAndFolders();
	if (checkedMovefiles == undefined || checkedMovefiles.size == 0) {
		// 如果未选中任何文件，则提示用户要先选
		$('#moveFilesMessage').html(checkFilesTip);
		$("#selectFileMoveModelAsAll").removeAttr("checked");
		$("#selectFileMoveModelAlert").hide();
		$('#moveFilesModal').modal('show');
	} else {
		// 否则，隐藏“剪切”和“复制”按钮，显示“粘贴”按钮
		if (checkedMovefiles.size < 100) {
			$("#stickFilesCount").text("（" + checkedMovefiles.size + "）");
		} else {
			$("#stickFilesCount").text("（99+）");
		}
		$("#copyFileButtonLi").removeClass("show");
		$("#copyFileButtonLi").addClass("hidden");
		$("#cutFileButtonLi").removeClass("show");
		$("#cutFileButtonLi").addClass("hidden");
		$("#stickFileButtonLi").removeClass("hidden");
		$("#stickFileButtonLi").addClass("show");
		isCopy = true;
	}
}

// 执行“粘贴”操作
function stickFile() {
	if (checkedMovefiles !== undefined && checkedMovefiles.size > 0) {
		if (isCopy) {
			$('#moveFilesMessage').text(
					"提示：确定将这" + checkedMovefiles.size + "项复制到当前位置么？");
			$('#moveFilesBox')
					.html(
							"<button id='dmvfbutton' type='button' class='btn btn-primary' onclick='doMoveFiles()'>全部复制</button>");
		} else {
			$('#moveFilesMessage').text(
					"提示：确定将这" + checkedMovefiles.size + "项移动到当前位置么？");
			$('#moveFilesBox')
					.html(
							"<button id='dmvfbutton' type='button' class='btn btn-danger' onclick='doMoveFiles()'>全部移动</button>");
		}
		$("#selectFileMoveModelAsAll").removeAttr("checked");
		$("#cancelMoveFilesBtn").attr('disabled', false);
		$("#selectFileMoveModelAlert").hide();
		$('#moveFilesModal').modal('show');
	}
}

// 先行确认文件移动操作
function doMoveFiles() {
	$("#dmvfbutton").attr('disabled', true);
	$("#cancelMoveFilesBtn").attr('disabled', true);
	var method = "MOVE";
	if (isCopy) {
		$('#moveFilesMessage').text("提示：正在复制，请稍候...");
		method = "COPY";
	} else {
		$('#moveFilesMessage').text("提示：正在移动，请稍候...");
	}
	// 确认移动目标位置
	$
			.ajax({
				type : "POST",
				dataType : "text",
				data : {
					strIdList : checkedMovefiles.filesId,
					strFidList : checkedMovefiles.foldersId,
					locationpath : locationpath,
					method : method
				},
				url : "homeController/confirmMoveFiles.ajax",
				success : function(result) {
					if (result == "mustLogin") {
						window.location.href = "prv/login.html";
					} else {
						switch (result) {
						case "noAuthorized":
							$('#moveFilesMessage').text("提示：您的操作未被授权，操作失败");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "errorParameter":
							$('#moveFilesMessage').text(
									"提示：参数不正确，无法完成此操作，请刷新后重试");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "cannotMoveFiles":
							$('#moveFilesMessage').text(
									"提示：出现意外错误，可能未能完成此操作，请刷新后重试");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "filesTotalOutOfLimit":
							$('#moveFilesMessage').text(
									"提示：该文件夹内存储的文件数量已达上限，无法添加更多文件");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "foldersTotalOutOfLimit":
							$('#moveFilesMessage').text(
									"提示：该文件夹内存储的文件夹数量已达上限，无法添加更多文件夹");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "confirmMoveFiles":
							strMoveOptMap = {};
							sendMoveFilesReq();
							break;
						default:
							if (result.startsWith("duplicationFileName:")) {
								repeMap = eval("(" + result.substring(20) + ")");
								repeIndex = 0;
								strMoveOptMap = {};
								mRepeSize = repeMap.repeFolders.length
										+ repeMap.repeNodes.length;
								if (repeMap.repeFolders.length > 0) {
									$("#mrepeFileName")
											.text(
													repeMap.repeFolders[repeIndex].folderName);
								} else {
									$("#mrepeFileName")
											.text(
													repeMap.repeNodes[repeIndex].fileName);
								}
								var authList = originFolderView.authList;
								if (checkAuth(authList, "D")) {
									$("#movecoverbtn").show();
								} else {
									$("#movecoverbtn").hide();
								}
								$("#selectFileMoveModelAlert").show();
							} else if (result
									.startsWith("CANT_MOVE_TO_INSIDE:")) {
								$('#moveFilesMessage').text(
										"错误：不能将一个文件夹移动到其自身内部："
												+ result.substring(20));
							} else {
								$('#moveFilesMessage').text(
										"提示：出现意外错误，可能未能完成此操作，请刷新后重试");
								$("#dmvfbutton").attr('disabled', false);
								$("#cancelMoveFilesBtn")
										.attr('disabled', false);
							}
							break;
						}
					}
				},
				error : function() {
					$('#moveFilesMessage').text("提示：出现意外错误，可能未能完成此操作，请刷新后重试");
					$("#dmvfbutton").attr('disabled', false);
					$("#cancelMoveFilesBtn").attr('disabled', false);
				}
			});
}

// 移动或复制——对冲突的文件进行依次询问
function selectFileMoveModel(t) {
	if ($("#selectFileMoveModelAsAll").prop("checked")) {
		while (repeIndex < mRepeSize) {
			if (repeIndex < repeMap.repeFolders.length) {
				strMoveOptMap[repeMap.repeFolders[repeIndex].folderId] = t;
			} else {
				strMoveOptMap[repeMap.repeNodes[repeIndex
						- repeMap.repeFolders.length].fileId] = t;
			}
			repeIndex++;
		}
		$("#selectFileMoveModelAlert").hide();
		sendMoveFilesReq();
	}
	if (repeIndex < repeMap.repeFolders.length) {
		strMoveOptMap[repeMap.repeFolders[repeIndex].folderId] = t;
	} else {
		strMoveOptMap[repeMap.repeNodes[repeIndex - repeMap.repeFolders.length].fileId] = t;
	}
	repeIndex++;
	if (repeIndex < mRepeSize) {
		if (repeIndex < repeMap.repeFolders.length) {
			$("#mrepeFileName").text(repeMap.repeFolders[repeIndex].folderName);
		} else {
			$("#mrepeFileName")
					.text(
							repeMap.repeNodes[repeIndex
									- repeMap.repeFolders.length].fileName);
		}
	} else {
		$("#selectFileMoveModelAlert").hide();
		sendMoveFilesReq();
	}
}

// 正式执行移动或复制文件操作
function sendMoveFilesReq() {
	// 取到对冲突文件的操作列表
	var strOptMap = JSON.stringify(strMoveOptMap);
	// 取到操作类型，是移动还是复制
	var method = "MOVE";
	if (isCopy) {
		method = "COPY";
	}
	$
			.ajax({
				type : "POST",
				dataType : "text",
				data : {
					strIdList : checkedMovefiles.filesId,
					strFidList : checkedMovefiles.foldersId,
					strOptMap : strOptMap,
					locationpath : locationpath,
					method : method
				},
				url : "homeController/moveCheckedFiles.ajax",
				success : function(result) {
					if (result == "mustLogin") {
						window.location.href = "prv/login.html";
					} else {
						switch (result) {
						case "noAuthorized":
							$('#moveFilesMessage').text("提示：您的操作未被授权，操作失败");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "errorParameter":
							$('#moveFilesMessage').text(
									"提示：参数不正确，无法完成此操作，请刷新后重试");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "filesTotalOutOfLimit":
							$('#moveFilesMessage').text(
									"提示：该文件夹内存储的文件数量已达上限，无法添加更多文件");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "foldersTotalOutOfLimit":
							$('#moveFilesMessage').text(
									"提示：该文件夹内存储的文件夹数量已达上限，无法添加更多文件夹");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "cannotMoveFiles":
							$('#moveFilesMessage').text(
									"提示：出现意外错误，可能未能完成此操作，请刷新后重试");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						case "moveFilesSuccess":
							$('#moveFilesModal').modal('hide');
							showFolderView(locationpath);
							break;
						default:
							$('#moveFilesMessage').text(
									"提示：出现意外错误，可能未能完成此操作，请刷新后重试");
							$("#dmvfbutton").attr('disabled', false);
							$("#cancelMoveFilesBtn").attr('disabled', false);
							break;
						}
					}
				},
				error : function() {
					$('#moveFilesMessage').text("提示：出现意外错误，可能未能完成此操作，请刷新后重试");
					$("#dmvfbutton").attr('disabled', false);
					$("#cancelMoveFilesBtn").attr('disabled', false);
				}
			});
}

var screenedFoldrView;// 经过排序的文件视图

// 执行搜索功能
function doSearchFile() {
	var keyworld = $("#sreachKeyWordIn").val();
	if (keyworld.length != 0) {
		// 如果用户在搜索字段中声明了全局搜索
		if (keyworld.startsWith("all:") || keyworld.startsWith("all：")) {
			selectInCompletePath(keyworld.substring(4));
		} else {
			startLoading();
			selectInThisPath(keyworld);// 否则，均在本级下搜索
			endLoading();
		}
	} else {
		if (folderView.keyWorld != null) {
			showFolderView(locationpath);
		} else {
			screenedFoldrView = null;
			showOriginFolderView();
		}
	}
}

// 在本级内搜索
function selectInThisPath(keyworld) {
	try {
		var reg = new RegExp(keyworld + "+");
		screenedFoldrView = $.extend(true, {}, originFolderView);
		screenedFoldrView.folderList = [];
		screenedFoldrView.fileList = [];
		for (var i = 0, j = originFolderView.folderList.length; i < j; i++) {
			if (reg.test(originFolderView.folderList[i].folderName)) {
				screenedFoldrView.folderList
						.push(originFolderView.folderList[i]);
			}
		}
		for (var i = 0, j = originFolderView.fileList.length; i < j; i++) {
			if (reg.test(originFolderView.fileList[i].fileName)) {
				screenedFoldrView.fileList.push(originFolderView.fileList[i]);
			}
		}
		$("#sortByFN").removeClass();
		$("#sortByCD").removeClass();
		$("#sortByFS").removeClass();
		$("#sortByCN").removeClass();
		$("#sortByOR").removeClass();
		folderView = $.extend(true, {}, screenedFoldrView);
		showFolderTable(folderView);
	} catch (e) {
		alert("错误：搜索关键字有误。请在特殊符号（例如“*”）前加上“\\”进行转义。");
	}
}

// 全路径查找
function selectInCompletePath(keyworld) {
	if (keyworld.length == 0) {
		showFolderView(locationpath);
		return;
	}
	startLoading();
	$.ajax({
		type : 'POST',
		dataType : 'text',
		data : {
			fid : locationpath,
			keyworld : keyworld
		},
		url : 'homeController/sreachInCompletePath.ajax',
		success : function(result) {
			endLoading();
			if (result == "ERROR") {
				doAlert();
				$("#tb").html("<span class='graytext'>获取失败，请尝试刷新</span>");
				$("#publishTime").html(
						"<span class='graytext'>获取失败，请尝试刷新</span>");
				$("#parentlistbox").html(
						"<span class='graytext'>获取失败，请尝试刷新</span>");
			} else if (result == "mustLogin") {
				window.location.href = "prv/login.html";
			} else if (result == "notAccess") {
				document.cookie = "folder_id=" + escape("root");
				window.location.href = "/";
			} else {
				folderView = eval("(" + result + ")");
				locationpath = folderView.folder.folderId;
				parentpath = folderView.folder.folderParent;
				constraintLevel = folderView.folder.folderConstraint;
				screenedFoldrView = null;
				$("#sreachKeyWordIn").val("all:" + folderView.keyWorld);
				showParentList(folderView);
				showAccountView(folderView);
				showPublishTime(folderView);
				originFolderView = $.extend(true, {}, folderView);
				$("#sortByFN").removeClass();
				$("#sortByCD").removeClass();
				$("#sortByFS").removeClass();
				$("#sortByCN").removeClass();
				$("#sortByOR").removeClass();
				showFolderTable(folderView);
				$("#fim_name").text(folderView.folder.folderName);
				$("#fim_creator").text("--");
				$("#fim_folderCreationDate").text("--");
				$("#fim_folderId").text("--");
				updateTheFolderInfo();
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

// 返回顶部实现
function goBackToTop() {
	$('html,body').animate({
		scrollTop : 0
	}, 'slow');
}

var getDownloadFileId;// 下载链接的文件ID
var getDownloadFileName;// 下载链接的文件名（便于下载工具识别）

// 获取某一文件的下载链接
function getDownloadURL() {
	$
			.ajax({
				url : 'externalLinksController/getDownloadKey.ajax',
				type : 'POST',
				dataType : 'text',
				data : {
					fId : getDownloadFileId
				},
				success : function(result) {
					// 获取链接
					var dlurl = window.location.protocol
							+ "//"
							+ window.location.host
							+ "/externalLinksController/downloadFileByKey/"
							+ encodeURIComponent(getDownloadFileName.replace(
									/\'/g, '').replace(/\r/g, "").replace(
									/\n/g, "")) + "?dkey=" + result;
					// 显示链接内容
					$("#downloadHrefBox").html(
							"<a href='" + dlurl + "'>" + dlurl + "</a>");
				},
				error : function() {
					$("#downloadHrefBox")
							.html(
									"<span class='text-muted'>获取失败，请检查网络状态或<a href='javascript:void(0);' onclick='getDownloadURL()'>点此</a>重新获取。</span>");
				}
			});
}

// 防止长耗时待机时会话超时的应答器，每分钟应答一次
function ping() {
	$.ajax({
		url : "homeController/ping.ajax",
		type : "POST",
		dataType : "text",
		data : {},
		success : function(result) {
			if (result != 'pong') {
				if (pingInt != null) {
					window.clearInterval(pingInt);
					pingInt = null;
				}
			}
		},
		error : function() {
			if (pingInt != null) {
				window.clearInterval(pingInt);
				pingInt = null;
			}
		}
	});
}

// 判断浏览器是否支持webkitdirectory属性且不为ios系统（判断是否能进行文件夹上传）
function isSupportWebkitdirectory() {
	var testWebkitdirectory = document.createElement("input");
	if ("webkitdirectory" in testWebkitdirectory
			&& !(/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent))) {
		return true;
	} else {
		return false;
	}
};

// 显示上传文件夹模态框
function showUploadFolderModel() {
	$("#importFolderAlert").hide();
	$("#importFolderAlert").text("");
	if (isImporting == false) {// 如果未进行上传，则还原上传文件夹的基本状态
		$("#folderpath").val("");
		$("#importfolder").val("");
		$("#importpros").width("0%");
		$("#importpros").attr('aria-valuenow', '0');
		$("#importstatus").html("");
		$("#folderpath").attr("disabled", false);
		$("#importFolderLevelBtn").attr("disabled", false);
		$("#importcount").text("");
		$("#importbutton").attr('disabled', false);
		$("#importfoldertypelist").html("");
		$("#selectFolderImportModelAlert").hide();
		if (account != null) {
			$("#folderpath")
					.attr("folderConstraintLevel", constraintLevel + "");
			$("#importfoldertype").text(folderTypes[constraintLevel]);
			for (var i = constraintLevel; i < folderTypes.length; i++) {
				$("#importfoldertypelist").append(
						"<li><a onclick='changeImportFolderType(" + i + ")'>"
								+ folderTypes[i] + "</a></li>");
			}
		} else {
			$("#importfoldertypelist").append(
					"<li><a onclick='changeImportFolderType(0)'>"
							+ folderTypes[0] + "</a></li>");
		}
	}
	$("#importFolderModal").modal('show');
}

// 点击上传路径文本框时弹出文件夹选择窗口
function checkimportpath() {
	$('#importfolder').click();
}

// 用户选择文件夹后回填路径
function getInputImport() {
	ifs = $("#importfolder")[0].files;
	if (ifs.length > 0) {
		importFolderName = ifs[0].webkitRelativePath.substring(0,
				ifs[0].webkitRelativePath.indexOf("/"));
		$("#folderpath").val(importFolderName);
	}
}

// 检查文件夹是否能够上传
function checkImportFolder() {
	if (isUpLoading == false && isImporting == false) {
		if (ifs != null && ifs.length > 0) {// 必须选中文件
			$("#folderpath").attr("disabled", true);
			$("#importFolderLevelBtn").attr("disabled", true);
			$("#importbutton").attr('disabled', true);
			$("#importFolderAlert").hide();
			$("#importFolderAlert").text("");
			isImporting = true;
			var maxSize = 0;
			var maxFileIndex = 0;
			// 找出最大体积的文件以便服务器进行效验
			for (var i = 0; i < ifs.length; i++) {
				if (ifs[i].size > maxSize) {
					maxSize = ifs[i].size;
					maxFileIndex = i;
				}
			}
			// 发送合法性检查请求
			$
					.ajax({
						url : 'homeController/checkImportFolder.ajax',
						type : 'POST',
						dataType : 'text',
						data : {
							folderName : importFolderName,
							maxSize : maxSize,
							folderId : locationpath
						},
						success : function(result) {
							var resJson = eval("(" + result + ")");
							switch (resJson.result) {
							case 'noAuthorized':
								showImportFolderAlert("提示：您的操作未被授权，无法开始上传");
								break;
							case 'errorParameter':
								showImportFolderAlert("提示：参数不正确，无法开始上传。必须选择一个文件夹");
								break;
							case 'mustLogin':
								window.location.href = "prv/login.html";
								break;
							case 'fileOverSize':
								showImportFolderAlert("提示：文件["
										+ ifs[maxFileIndex].webkitRelativePath
										+ "]的体积超过最大限制（" + resJson.maxSize
										+ "），无法开始上传");
								break;
							case 'foldersTotalOutOfLimit':
								showImportFolderAlert("提示：该文件夹内存储的文件夹数量已达上限，无法在其中上传更多文件夹。您可以尝试将其上传至其他文件夹内。");
								break;
							case 'repeatFolder_Both':
								$("#repeFolderName").text(importFolderName);
								$("#importcoverbtn").hide();
								$("#selectFolderImportModelAlert").show();
								break;
							case 'repeatFolder_coverOrBoth':
								$("#repeFolderName").text(importFolderName);
								$("#importcoverbtn").show();
								$("#selectFolderImportModelAlert").show();
								break;
							case 'permitUpload':
								iteratorImport(0);// 直接允许上传
								break;
							default:
								showImportFolderAlert("提示：出现意外错误，无法开始上传");
								break;
							}
						},
						error : function() {
							showImportFolderAlert("提示：出现意外错误，无法开始上传");
						}
					});
		} else {
			showImportFolderAlert("提示：您未选择任何文件夹，无法开始上传");
		}
	} else {
		showImportFolderAlert("提示：另一项上传文件或文件夹的任务尚未完成，无法开始上传");
	}
}

// 显示上传文件夹错误提示
function showImportFolderAlert(txt) {
	isImporting = false;
	$("#folderpath").attr("disabled", false);
	$("#importFolderLevelBtn").attr("disabled", false);
	$("#importFolderAlert").show();
	$("#importFolderAlert").text(txt);
	$("#importbutton").attr('disabled', false);
}

// 显示上传文件夹进度
function importProgress(evt) {
	if (evt.lengthComputable) {
		// evt.loaded：文件上传的大小 evt.total：文件总的大小
		var percentComplete = Math.round((evt.loaded) * 100 / evt.total);
		// 加载进度条，同时显示信息
		$("#importpros").width(percentComplete + "%");
		$("#importpros").attr('aria-valuenow', "" + percentComplete);
	}
}

// 覆盖并上传文件夹
function importAndCover() {
	$("#selectFolderImportModelAlert").hide();
	$.ajax({
		url : 'homeController/deleteFolderByName.ajax',
		type : 'POST',
		data : {
			parentId : locationpath,
			folderName : importFolderName
		},
		dataType : 'text',
		success : function(result) {
			if (result == 'deleteSuccess') {
				iteratorImport(0);// 若覆盖成功，则开始上传
			} else {
				showImportFolderAlert("提示：无法覆盖原文件夹，上传失败");
			}
		},
		error : function() {
			showImportFolderAlert("提示：无法覆盖原文件夹，上传失败");
		}
	});
}

// 保留两者并上传文件夹
function importAndBoth() {
	$("#selectFolderImportModelAlert").hide();
	var fc = $("#folderpath").attr("folderConstraintLevel");// 文件夹访问级别
	$
			.ajax({
				url : 'homeController/createNewFolderByName.ajax',
				type : 'POST',
				data : {
					parentId : locationpath,
					folderName : importFolderName,
					folderConstraint : fc
				},
				dataType : 'text',
				success : function(result) {
					var resJson = eval("(" + result + ")");
					if (resJson.result == 'success') {
						iteratorImport(0, resJson.newName);// 若新建成功，则使用新文件夹名称开始上传
					} else if (resJson.result == 'foldersTotalOutOfLimit') {
						showImportFolderAlert("提示：该文件夹内存储的文件夹数量已达上限，无法上传同名文件夹并保留两者。您可以尝试将其上传至其他文件夹内。");
					} else {
						showImportFolderAlert("提示：生成新文件夹名称失败，无法开始上传");
					}
				},
				error : function() {
					showImportFolderAlert("提示：生成新文件夹名称失败，无法开始上传");
				}
			});
}

// 迭代上传文件夹内的文件（直接上传）
function iteratorImport(i, newFolderName) {
	$("#importpros").width("0%");// 先将进度条置0
	$("#importpros").attr('aria-valuenow', "0");
	var uploadfile = ifs[i];// 获取要上传的文件
	var fcount = ifs.length;
	var fc = $("#folderpath").attr("folderConstraintLevel");// 文件夹访问级别
	if (uploadfile != null) {
		var fname = uploadfile.webkitRelativePath;
		if (fcount > 1) {
			$("#importcount").text("（" + (i + 1) + "/" + fcount + "）");// 显示当前进度
		}
		$("#importstatus")
				.prepend(
						"<p>" + fname + "<span id='ils_" + i
								+ "'>[正在上传...]</span></p>");
		xhr = new XMLHttpRequest();// 这东西类似于servlet里面的request

		var fd = new FormData();// 用于封装文件数据的对象

		fd.append("file", uploadfile);// 将文件对象添加到FormData对象中，字段名为uploadfile
		fd.append("folderId", locationpath);
		fd.append("folderConstraint", fc);
		fd.append("originalFileName", fname);
		if (!!newFolderName) {
			fd.append("newFolderName", newFolderName);
		}
		xhr.open("POST", "homeController/doImportFolder.ajax", true);// 上传目标

		xhr.upload.addEventListener("progress", importProgress, false);// 这个是对上传进度的监听
		// 上面的三个参数分别是：事件名（指定名称）、回调函数、是否冒泡（一般是false即可）

		xhr.send(fd);// 上传FormData对象

		if (pingInt == null) {
			pingInt = setInterval("ping()", 60000);// 上传中开始计时应答
		}

		// 上传结束后执行的回调函数
		xhr.onloadend = function() {
			// 停止应答计时
			if (pingInt != null) {
				window.clearInterval(pingInt);
				pingInt = null;
			}
			if (xhr.status === 200) {
				// TODO 上传成功
				var result = xhr.responseText;
				if (result == "uploadsuccess") {
					$("#ils_" + i).text("[已完成]");
					var ni = i + 1;
					if (ni < fcount) {
						iteratorImport(ni, newFolderName);
					} else {
						// 完成全部上传后，清空所有提示信息，并还原上传窗口
						isImporting = false;
						$("#folderpath").removeAttr("disabled");
						$("#importFolderLevelBtn").removeAttr("disabled");
						$("#importfolder").val("");
						$("#folderpath").val("");
						$("#importpros").width("0%");
						$("#importpros").attr('aria-valuenow', "0");
						$("#importbutton").attr('disabled', false);
						$("#importcount").text("");
						$("#importstatus").text("");
						$('#importFolderModal').modal('hide');
						showFolderView(locationpath);
					}
				} else if (result == "uploaderror") {
					showImportFolderAlert("提示：出现意外错误，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#ils_" + i).text("[失败]");
				} else if (result == "foldersTotalOutOfLimit") {
					showImportFolderAlert("提示：该文件夹内存储的文件夹数量已达上限，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#ils_" + i).text("[失败]");
				} else if (result == "filesTotalOutOfLimit") {
					showImportFolderAlert("提示：该文件夹内存储的文件数量已达上限，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#ils_" + i).text("[失败]");
				} else {
					showImportFolderAlert("提示：出现意外错误，文件：[" + fname
							+ "]上传失败，上传被中断。");
					$("#ils_" + i).text("[失败]");
				}
			} else {
				showImportFolderAlert("提示：出现意外错误，文件：[" + fname + "]上传失败，上传被中断。");
				$("#ils_" + i).text("[失败]");
			}
		};
	} else {
		showImportFolderAlert("提示：要上传的文件不存在。");
		$("#importstatus").prepend(
				"<p>未找到要上传的文件<span id='ils_" + i + "'>[失败]</span></p>");
	}
}

// 取消文件夹上传
function abortImport() {
	if (isImporting) {
		isImporting = false;
		if (xhr != null) {
			xhr.abort();
		}
	}
	$('#importFolderModal').modal('hide');
	showFolderView(locationpath);
}

// 修改上传文件夹约束等级
function changeImportFolderType(type) {
	$("#importfoldertype").text(folderTypes[type]);
	$("#folderpath").attr("folderConstraintLevel", type + "");
}

// 修改密码
function doChangePassword() {
	// 还原提示状态
	$(
			"#changepassword_oldepwdbox,#changepassword_newpwdbox,#changepassword_reqnewpwdbox")
			.removeClass("has-error");
	$("#changepasswordalertbox").hide();
	var change_oldPassword = $("#changepassword_oldpwd").val();
	var change_newPassword = $("#changepassword_newpwd").val();
	var change_reqNewPassword = $("#changepassword_reqnewpwd").val();
	// 输入非空检查
	if (change_oldPassword.length == 0) {
		$("#changepassword_oldepwdbox").addClass("has-error");
		$("#changepassword_oldpwd").focus();
		return;
	}
	if (change_newPassword.length == 0) {
		$("#changepassword_newpwdbox").addClass("has-error");
		$("#changepassword_newpwd").focus();
		return;
	}
	if (change_reqNewPassword.length == 0) {
		$("#changepassword_reqnewpwdbox").addClass("has-error");
		$("#changepassword_reqnewpwd").focus();
		return;
	}
	// 确认密码检查
	isChangingPassword = true;
	$(
			"#changepassword_oldpwd,#changepassword_newpwd,#changepassword_reqnewpwd,#changePasswordButton,#changepassword_vercode")
			.attr('disabled', true);
	if (change_newPassword + "" != change_reqNewPassword + "") {
		showChangePasswordAlert("提示：两次输入的新密码不一致，请检查确认");
		$("#changepassword_newpwdbox").addClass("has-error");
		$("#changepassword_reqnewpwdbox").addClass("has-error");
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
			var changepwd_publicKeyInfo = eval("(" + result + ")");
			// 生成JSON对象格式的信息
			var changePasswordInfo = '{oldPwd:"' + change_oldPassword
					+ '",newPwd:"' + change_newPassword + '",time:"'
					+ changepwd_publicKeyInfo.time + '"}';
			var encrypt = new JSEncrypt();// 加密插件对象
			encrypt.setPublicKey(changepwd_publicKeyInfo.publicKey);// 设置公钥
			var encrypted = encrypt.encrypt(changePasswordInfo);// 进行加密
			sendChangePasswordInfo(encrypted);
		},
		error : function() {
			showChangePasswordAlert("提示：密码修改失败，请检查网络链接或服务器运行状态");
		}
	});
}

// 将加密数据发送至服务器并显示操作结果
function sendChangePasswordInfo(encrypted) {
	$
			.ajax({
				type : "POST",
				dataType : "text",
				url : "homeController/doChangePassword.ajax",
				data : {
					encrypted : encrypted,
					vercode : $("#changepassword_vercode").val()
				},
				success : function(result) {
					$("#changepassword_vccodebox").hide();
					isChangingPassword = false;
					switch (result) {
					case "success":
						$('#changePasswordModal').modal('hide');
						break;
					case "mustlogin":
						showChangePasswordAlert("提示：登录已失效或尚未登录账户，请刷新并登陆账户");
						break;
					case "illegal":
						showChangePasswordAlert("提示：用户修改密码功能已被禁用，请求被拒绝");
						break;
					case "oldpwderror":
						showChangePasswordAlert("提示：旧密码输入错误，请求被拒绝");
						$("#changepassword_oldepwdbox").addClass("has-error");
						break;
					case "needsubmitvercode":
						$(
								"#changepassword_oldpwd,#changepassword_newpwd,#changepassword_reqnewpwd,#changePasswordButton")
								.attr('disabled', false);
						$("#changepassword_vccodebox")
								.html(
										"<label id='changepassword_vercodetitle' class='col-sm-5'><img id='changepassword_showvercode' class='vercodeimg' alt='点击获取验证码' src='homeController/getNewVerCode.do?s="
												+ (new Date()).getTime()
												+ "' onclick='changePasswordGetNewVerCode()'></label><div class='col-sm-7'><input type='text' class='form-control' id='changepassword_vercode' placeholder='验证码……'></div>");
						$("#changepassword_vccodebox").show();
						isChangingPassword = false;
						break;
					case "invalidnewpwd":
						showChangePasswordAlert("提示：密码修改失败，新密码不合法。新密码的长度需为3-32个字符，且仅支持ISO-8859-1中的字符（推荐使用英文字母、英文符号及阿拉伯数字）。");
						break;
					case "error":
						showChangePasswordAlert("提示：密码修改失败，修改请求无法通过加密效验（可能是请求耗时过长导致的）");
						break;
					case "cannotchangepwd":
						showChangePasswordAlert("提示：密码修改失败，发生意外错误，请稍后重试或联系管理员");
						break;
					default:
						showChangePasswordAlert("提示：密码修改失败，发生未知错误");
						break;
					}
				},
				error : function() {
					showChangePasswordAlert("提示：密码修改失败，请检查网络链接或服务器运行状态");
				}
			});
}

// 显示修改密码错误提示
function showChangePasswordAlert(txt) {
	isChangingPassword = false;
	$(
			"#changepassword_oldpwd,#changepassword_newpwd,#changepassword_reqnewpwd,#changePasswordButton,#changepassword_vercode")
			.attr('disabled', false);
	$("#changepasswordalertbox").show();
	$("#changepasswordalertbox").text(txt);
}

// （修改密码版本的）获取一个新的验证码
function changePasswordGetNewVerCode() {
	$("#changepassword_showvercode").attr("src",
			"homeController/getNewVerCode.do?s=" + (new Date()).getTime());
}

// 获取永久资源链接
function getFileChain(fileId, fileName) {
	$("#fileChainTextarea").text("正在获取……");
	$("#copyChainBtn").attr('disabled', true);
	$('#fileChainModal').modal('show');
	$.ajax({
		type : "POST",
		dataType : "text",
		url : "homeController/getFileChainKey.ajax",
		data : {
			fid : fileId
		},
		success : function(result) {
			switch (result) {
			case "ERROR":
				$("#fileChainTextarea").text("提示：获取失败，请刷新页面或稍后再试。");
				break;
			case "mustlogin":
				window.location.href = "prv/login.html";
				break;
			default:
				$("#fileChainTextarea").text(
						window.location.protocol
								+ "//"
								+ window.location.host
								+ "/externalLinksController/chain/"
								+ encodeURIComponent(fileName
										.replace(/\'/g, '').replace(/\r/g, "")
										.replace(/\n/g, "")) + "?ckey="
								+ encodeURIComponent(result));
				$("#copyChainBtn").attr('disabled', false);
				break;
			}
		},
		error : function() {
			$("#fileChainTextarea").text("提示：获取失败，无法连接服务器。");
		}
	});
}

// 复制链接内容
function copyFileChain() {
	let node = document.getElementById('fileChainTextarea');// input框
	node.select();
	document.execCommand('copy');
}

// 显示公告模态框
function showNoticeModal() {
	$('#noticeModal').modal('show');
}

// 加载公告内容并初始化公告模态框
function initNoticeModal() {
	$("#noticeModalBody").load(
			"resourceController/getNoticeContext.do",
			function() {
				$('#noticeModalBody img').css("max-width", "100%");
				if (winHeight >= 300) {
					$('#noticeModalBody').css("max-height",
							(winHeight - 180) + "px");
				} else {
					$('#noticeModalBody').css("max-height", "300px");
				}
				noticeInited = true;
				showNoticeModal();
				showNoticeBtn();
			});
}

// 打开主页时自动订阅未阅读过的公告信息并显示，如果该公告已经阅读过则不会显示。
function subscribeNotice() {
	$.ajax({
		url : 'resourceController/getNoticeMD5.ajax',
		data : {},
		type : 'POST',
		dataType : 'text',
		success : function(result) {
			if (result != "") {
				var cookieMd5 = document.cookie.match(new RegExp(
						"(^| )notice_md5=([^;]*)(;|$)"));
				if (cookieMd5) {
					if (result == unescape(cookieMd5[2])) {
						showNoticeBtn();
						return;
					}
				} else {
					cookieMd5 = document.cookie.match(new RegExp(
							"(^| )notice_md5_30=([^;]*)(;|$)"));
					if (cookieMd5) {
						if (result == unescape(cookieMd5[2])) {
							showNoticeBtn();
							return;
						}
					}
				}
				initNoticeModal();
				document.cookie = "notice_md5=" + escape(result);
			}
		},
		error : function() {
			alert("错误：无法从服务器获取公告信息，请尝试刷新页面。");
		}
	});
}

// 显示“公告”浮动按钮，方便用户手动打开公告
function showNoticeBtn() {
	$("#shownoticebox").removeClass("hidden");
	$("#shownoticebox").addClass("show");
}

// 手动显示公告
function showNotice() {
	if (noticeInited) {
		showNoticeModal();
	} else {
		initNoticeModal();
	}
}

// 该方法用于请求并继续加载文件夹视图的后续数据（可能会被迭代调用）
function loadingRemainingFolderView(targetId) {
	// 判断是否正在执行另一个相同的请求，避免重复操作
	if (remainingLoadingRequest) {
		return;
	}
	// 计算新的查询偏移量
	var newfoldersOffset = 0;
	var newfilesOffset = 0;
	if ((folderView.foldersOffset - folderView.selectStep) > 0) {
		newfoldersOffset = folderView.foldersOffset - folderView.selectStep;
	}
	if ((folderView.filesOffset - folderView.selectStep) > 0) {
		newfilesOffset = folderView.filesOffset - folderView.selectStep;
	}
	if (newfoldersOffset <= 0 && newfilesOffset <= 0) {
		originFolderView = $.extend(true, {}, folderView);
		hiddenLoadingRemaininngBox();
		doFixedRow(targetId);
		return;
	}
	var loadingRemainingRate_folders = 1;
	var loadingRemainingRate_files = 1;
	if (totalFoldersOffset > 0) {
		loadingRemainingRate_folders = (totalFoldersOffset - newfoldersOffset)
				/ totalFoldersOffset;
	}
	if (totalFilesOffset > 0) {
		loadingRemainingRate_files = (totalFilesOffset - newfilesOffset)
				/ totalFilesOffset;
	}
	var loadingRemainingRate = (loadingRemainingRate_folders + loadingRemainingRate_files) / 2;
	$("#loadingrate").text(parseInt(loadingRemainingRate * 100) + "%");
	remainingLoadingRequest = $
			.ajax({
				url : 'homeController/getRemainingFolderView.ajax',
				data : {
					fid : locationpath,
					foldersOffset : newfoldersOffset,
					filesOffset : newfilesOffset
				},
				type : 'POST',
				dataType : 'text',
				success : function(result) {
					remainingLoadingRequest = null;
					switch (result) {
					case "ERROR":
						alert("错误：无法加载剩余文件列表，文件数据可能未显示完全，请刷新重试！");
						hiddenLoadingRemaininngBox();
						doFixedRow();
						break;
					case "NOT_FOUND":
					case "notAccess":
						document.cookie = "folder_id=" + escape("root");// 归位记忆路径
					case "mustLogin":
						window.location.href = "/";
						break;
					default:
						folderView.foldersOffset = newfoldersOffset;
						folderView.filesOffset = newfilesOffset;
						var remainingFV = eval("(" + result + ")");
						updateFolderTable(remainingFV);
						updateTheFolderInfo();
						if (folderView.foldersOffset > 0
								|| folderView.filesOffset > 0) {
							loadingRemainingFolderView(targetId);
						} else {
							originFolderView = $.extend(true, {}, folderView);
							hiddenLoadingRemaininngBox();
							doFixedRow(targetId);
						}
						break;
					}
				},
				error : function(jqXHR, textStatus, errorThrown) {
					remainingLoadingRequest = null;
					hiddenLoadingRemaininngBox();
					if ('abort' != textStatus) {
						alert("错误：无法连接服务器，文件列表加载被中断。请刷新重试！");
					}
				}
			});
}

// 定位指定文件所在行
function doFixedRow(targetId) {
	if (targetId && targetId.length > 0) {
		$("#" + targetId).addClass("info");
		$("html,body").animate({
			scrollTop : $("#" + targetId).offset().top - $(window).height() / 2
		}, 'slow');
	}
}

// 显示“正在加载文件列表”提示栏
function showLoadingRemaininngBox() {
	loadingComplete = false;
	$("#loadingremaininngbox").addClass("show");
	$("#loadingremaininngbox").removeClass("hidden");
	$("#searchbtn").attr('disabled', 'disabled');
}

// 隐藏“正在加载文件列表”提示栏
function hiddenLoadingRemaininngBox() {
	loadingComplete = true;
	$("#loadingremaininngbox").removeClass("show");
	$("#loadingremaininngbox").addClass("hidden");
	$("#searchbtn").removeAttr('disabled');
}

// 将加载的后续文件夹视图数据更新至页面上显示
function updateFolderTable(remainingFV) {
	var authList = folderView.authList;
	var aD = false;
	var aR = false;
	var aL = false;
	var aO = false;
	if (checkAuth(authList, "D")) {
		aD = true;
	}
	if (checkAuth(authList, "R")) {
		aR = true;
	}
	if (checkAuth(authList, "L")) {
		aL = true;
	}
	if (checkAuth(authList, "O")) {
		aO = true;
	}
	if (remainingFV.folderList) {
		if (remainingFV.folderList.length > 0) {
			for (var i1 = remainingFV.folderList.length; i1 > 0; i1--) {
				var f = remainingFV.folderList[i1 - 1];
				if (!folderContains(folderView.folderList, f.folderId)) {
					folderView.folderList.unshift(f);
					$("[iskfolder=true]:last").after(
							createNewFolderRow(f, aD, aR, aO));
				}
			}
		}
	}
	if (remainingFV.fileList) {
		if (remainingFV.fileList.length > 0) {
			for (var i2 = remainingFV.fileList.length; i2 > 0; i2--) {
				var fi = remainingFV.fileList[i2 - 1];
				if (!fileContains(folderView.fileList, fi.fileId)) {
					folderView.fileList.unshift(fi);
					$("#foldertable").append(createFileRow(fi, aL, aD, aR, aO));
				}
			}
		}
	}
}

// 判断文件夹数组中是否存已在ID相同的某个文件夹
function folderContains(folderList, targetFolderId) {
	for (var i = folderList.length; i > 0; i--) {
		if (folderList[i - 1].folderId == targetFolderId) {
			return true;
		}
	}
	return false;
}

// 判断文件数组中是否存已在ID相同的某个文件
function fileContains(fileList, targetFileId) {
	for (var i = fileList.length; i > 0; i--) {
		if (fileList[i - 1].fileId == targetFileId) {
			return true;
		}
	}
	return false;
}

// 更新文件夹视图信息
function updateTheFolderInfo() {
	$("#fim_statistics").text(
			"共包含 " + folderView.folderList.length + " 个文件夹， "
					+ folderView.fileList.length + " 个文件。");
}

// 替换所有引号，将其进一步转义，主要用于传递带引号的文件名
function replaceAllQuotationMarks(txt) {
	return txt.replace(/\"/g, "\\\"");
}