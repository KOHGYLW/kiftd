/**
 * Kplayer播放器内置功能
 */
var tReq;
var tTimer;
var pingInt;
$(function() {
	window.onresize = function() {
		showCloseBtn();
	}
	pingInt = setInterval("ping()", 60000);
	var fileId = getFileId();
	$
			.ajax({
				url : 'homeController/playVideo.ajax',
				type : 'POST',
				dataType : 'text',
				data : {
					fileId : fileId
				},
				success : function(result) {
					if (result != "ERROR") {
						f = eval("(" + result + ")");
						$("#vname").text(f.fileName);
						$("#vcreator").text(f.fileCreator);
						$("#vcdate").text(f.fileCreationDate);
						$("#vsize").text(f.fileSize);
						if (f.needEncode == "N") {
							playVideo();
						} else {
							$("#playerMassage")
									.html(
											"<h2>播放器正在努力解码中...</h2><h3>已完成：<span id='transcodeProgress'>0</span>%</h3><p class='text-muted'>提示：该视频需解码后播放，请耐心等待！</p>");
							doTranscode();
						}
					} else {
						alert("错误：无法定位要预览的文件或该操作未被授权。");
						reMainPage();
					}
				},
				error : function() {
					alert("错误：请求失败，请刷新重试。");
					reMainPage();
				}
			});
});
// 获取URL上的视频id参数，它必须是第一个参数。
function getFileId() {
	var url = location.search;
	if (url.indexOf("?") != -1) {
		var str = url.substr(1);
		strs = str.split("=");
		return strs[1];
	}
	return "";
}
// 显示视频信息并播放视频
function playVideo() {
	$("#playerbox")
			.html(
					"<video id='kiftplayer' class='video-js col-md-12' controls preload='auto' height='500'>"
							+ "<source src='resourceController/getResource/"
							+ f.fileId + "' type='video/mp4'></video>");
	var player = videojs('kiftplayer', {
		preload : 'auto'
	});
	player.ready(function() {
		this.play();
	});
}

// 关闭当前窗口并释放播放器
function reMainPage() {
	if (tReq != null) {
		tReq.abort()
	}
	if (tTimer != null) {
		window.clearTimeout(tTimer);
	}
	window.opener = null;
	window.open('', '_self');
	window.close();
}

// 进行转码请求并监听进度状态（轮询）
function doTranscode() {
	tReq = $.ajax({
		url : 'resourceController/getVideoTranscodeStatus.ajax',
		type : 'POST',
		dataType : 'text',
		data : {
			fileId : f.fileId
		},
		success : function(result) {
			if (result == "FIN") {
				playVideo();
			} else if (result == "ERROR") {
				alert("错误：请求失败，请刷新重试。");
				reMainPage();
			} else {
				$("#transcodeProgress").text(result);
				tTimer = setTimeout('doTranscode()', 500);// 每隔1秒询问一次进度
			}
		},
		error : function() {
			alert("错误：请求失败，请刷新重试。");
			reMainPage();
		}
	});
}

function showCloseBtn() {
	var win = $(window).width();
	if (win < 450) {
		$("#closeBtn").addClass("hidden");
	} else {
		$("#closeBtn").removeClass("hidden");
	}
}

// 防止播放视频时会话超时的应答器，每分钟应答一次
function ping() {
	$.ajax({
		url : "homeController/ping.ajax",
		type : "POST",
		dataType : "text",
		data : {},
		success : function(result) {
			if (result != 'pong') {
				window.clearInterval(pingInt);
			}
		},
		error : function() {
			window.clearInterval(pingInt);
		}
	});
}