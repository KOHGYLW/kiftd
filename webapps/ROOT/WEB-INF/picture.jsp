<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%
	String path = request.getContextPath();
	String basePath = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort()
			+ path + "/";
%>
<!doctype html>
<html>
<head>
<base href="<%=basePath%>">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KViewer</title>
<link rel="stylesheet" href="css/bootstrap.min.css">
<link rel="stylesheet" href="css/overrall.min.css">
<link rel="icon" type="image/x-icon" href="css/picture.png" />
</head>

<body>
	<%-- 中央布局 --%>
	<div class="container">

		<%-- 头部 --%>
		<div class="row">
			<div class="col-md-12">
				<div class="titlebox">
					<span class="titletext"><em> 青阳图片查看器 <small><span
								class="graytext">KIFT-Viewer</span></small></em></span>
					<button class="btn btn-link rightbtn" onclick="reMainPage()">
						关闭 <span class="glyphicon glyphicon-share-alt" aria-hidden="true"></span>
					</button>
				</div>
				<hr />
			</div>
		</div>
		<%-- end 头部 --%>

		<%-- 主体 --%>
		<div class="row">
			<div class="col-md-12">
				<p class="subtitle">图片名称：${picture.fileName }</p>
				<p class="subtitle">${picture.fileCreator }/${picture.fileCreationDate }/${picture.fileSize }
					MB</p>
				<br />
				<!-- 图片窗口组件位置 -->
				<img id="kiftpicture" class="video-js col-md-12"
					src="fileblocks/${picture.filePath }" name="${picture.fileName }"
					alt="错误：图片无法正常显示" />
			</div>
		</div>
		<%-- end 主体 --%>

	</div>
	<%-- end 中央布局 --%>

</body>
<script type="text/javascript" src="js/jquery-3.3.1.min.js"></script>
<script type="text/javascript" src="js/bootstrap.min.js"></script>
<script type="text/javascript">
	function reMainPage() {
		window.opener = null;
		window.open('', '_self');
		window.close();
	}
</script>
</html>