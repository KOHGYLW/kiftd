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
<link rel="stylesheet" href="css/bootstrap.min.css">
<link rel="stylesheet" href="css/overrall.min.css">
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
			<div class="col-md-4 col-md-offset-4">
				<p class="centerText" style="font-size: 30px;color: #4D4D4D">
					<strong>欢迎使用青阳网络文件传输系统</strong><em>KIFT</em></p>
				<p class="centerText" style="font-size: 18px;color: #9C9C9C">
					<span class="glyphicon glyphicon-user"></span> 您需要登录以进入系统</p>
				<div class="panel panel-default">
					<div class="panel-heading">
						<h3 class="panel-title">请登录</h3>
					</div>
					<div class="panel-body">
						<form class="form-horizontal">
							<div class="form-group" id="accountidbox">
								<label for="accountid" id="accountidtitle"
									class="col-sm-3 control-label">账户：</label>
								<div class="col-sm-9">
									<input type="text" class="form-control" id="accountid"
										placeholder="请输入账户……">
								</div>
							</div>
							<div class="form-group" id="accountpwdbox">
								<label for="accountpwd" id="accountpwdtitle"
									class="col-sm-3 control-label">密码：</label>
								<div class="col-sm-9">
									<input type="password" class="form-control" id="accountpwd"
										placeholder="请输入密码……">
								</div>
							</div>
							<br />
							<div id="alertbox" role="alert"></div>
							<input class="form-control btn-success" type="button" value="登录"
								onclick="dologin()"> <br />
						</form>
					</div>
				</div>
			</div>
		</div>
		<%-- end 主体 --%>

	</div>
	<%-- end 中央布局 --%>
</body>
<script type="text/javascript" src="js/jquery-3.3.1.min.js"></script>
<script type="text/javascript" src="js/bootstrap.min.js"></script>
<script type="text/javascript" src="js/login.js"></script>
</html>