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
<title>KIFT</title>
<link rel="stylesheet" href="css/bootstrap.css">
<link rel="stylesheet" href="css/overrall.css">
<link rel="icon" type="image/x-icon" href="css/icon.png" />
</head>

<body>
	<%-- 中央布局 --%>
	<div class="container">

		<%-- 头部 --%>
		<div class="row">
			<div class="col-md-12">
				<div class="titlebox">
					<span class="titletext"><em> 青阳网络文件传输系统 <small><span
								class="graytext">KIFT</span></small></em></span>
				</div>
				<hr />
			</div>
		</div>
		<%-- end 头部 --%>

		<%-- 主体 --%>
		<div class="row">
			<div class="col-md-12">
				<h2 class="centerText">
					<span class="glyphicon glyphicon-exclamation-sign"
						aria-hidden="true"></span>错误：无法访问到的路径！
				</h2>
				<br />
				<h4 class="centerText">您所要访问的路径无法访问，请检查URL是否正确。如果您不知道为何会出现该问题，请立即告知系统管理员。</h4>
				<p class="centerText">这可能是由于以下问题引起：</p>
				<ul class="centerText">
					<li>访问路径无效或非法</li>
					<li>系统运行时出现意外错误</li>
					<li>部署失误导致的页面丢失</li>
					<li>网络问题</li>
				</ul>
				<p class="centerText">您可以使用以下链接返回系统主页：</p>
				<p class="centerText"><a href="home.jsp"><span class="glyphicon glyphicon-home"></span>返回主页</a></p>
			</div>
		</div>
		<%-- end 修改文件夹模态框 --%>
	</div>
</body>
<script type="text/javascript" src="js/jquery-3.2.1.js"></script>
<script type="text/javascript" src="js/bootstrap.js"></script>
</html>