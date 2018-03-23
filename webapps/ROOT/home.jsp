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
								class="graytext">KIFT</span></small></em></span> <span id="tb" class="rightbtn"></span>
					<button class="btn btn-link rightbtn" onclick="refreshFolderView()">
						刷新 <span class="glyphicon glyphicon-repeat" aria-hidden="true"></span>
					</button>
				</div>
				<hr />
			</div>
		</div>
		<%-- end 头部 --%>

		<%-- 主体 --%>
		<div class="row">
			<div class="col-md-12">
				<p class="subtitle">
					文件同步时间：<span id="publishTime"></span>
				</p>
				<p class="subtitle">
					OS：<span id="serverOS"><span class="graytext">加载中...</span></span>
				</p>
				<div id="filetable" class="panel panel-default">
					<!-- Default panel contents -->
					<div class="panel-heading">
						<p class="heading" id="parentlistbox"></p>
					</div>
					<table class="table table-hover">
						<thead>
							<tr>
								<th onclick="checkallfile()">文件名</th>
								<th>创建日期</th>
								<th>大小</th>
								<th>创建者</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody id="foldertable"></tbody>
					</table>
				</div>
			</div>
		</div>
		<%-- end 主体 --%>

	</div>
	<%-- end 中央布局 --%>

	<%-- 登录模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="loginModal"
		tabindex="-1" role="dialog" aria-labelledby="loginModelTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="loginModelTitle">
						<span class="glyphicon glyphicon-user"></span> 账户登录
					</h4>
				</div>
				<div class="modal-body">
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
						<div id="alertbox" role="alert"></div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<button type="button" class="btn btn-primary" onclick="dologin()">登录</button>
				</div>
			</div>
		</div>
	</div>
	<%-- end 登陆模态框 --%>
	<%-- 注销模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="logoutModal"
		tabindex="-1" role="dialog" aria-labelledby="logoutModelTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="logoutModelTitle">
						<span class="glyphicon glyphicon-comment"></span> 注销
					</h4>
				</div>
				<div class="modal-body">
					<h5>提示：您确认要注销么？</h5>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<button type="button" class="btn btn-danger" onclick="dologout()">注销</button>
				</div>
			</div>
		</div>
	</div>
	<%-- end 注销模态框 --%>
	<%-- 新建文件夹模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="newFolderModal"
		tabindex="-1" role="dialog" aria-labelledby="newFolderlMolderTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="newFolderlMolderTitle">
						<span class="glyphicon glyphicon-folder-open"></span> 新建文件夹
					</h4>
				</div>
				<div class="modal-body">
					<form class="form-horizontal">
						<div class="form-group" id="foldernamebox">
							<label for="folderid" id="foldernametitle"
								class="col-sm-3 control-label">名称：</label>
							<div class="col-sm-9">
								<input type="text" class="form-control" id="foldername"
									placeholder="请输入新文件夹的名称……">
							</div>
						</div>
						<div id="folderalert" role="alert"></div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<button type="button" class="btn btn-primary"
						onclick="createfolder()">创建</button>
				</div>
			</div>
		</div>
	</div>
	<%-- end 新建文件夹模态框 --%>
	<%-- 删除文件夹模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="deleteFolderModal"
		tabindex="-1" role="dialog" aria-labelledby="deleteFolderModelTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="deleteFolderModelTitle">
						<span class="glyphicon glyphicon-comment"></span> 删除文件夹
					</h4>
				</div>
				<div class="modal-body">
					<h5 id="deleteFolderMessage"></h5>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<span id="deleteFolderBox"></span>
				</div>
			</div>
		</div>
	</div>
	<%-- end 删除文件夹模态框 --%>
	<%-- 修改文件夹模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="renameFolderModal"
		tabindex="-1" role="dialog" aria-labelledby="renameFolderMolderTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="renameFolderMolderTitle">
						<span class="glyphicon glyphicon-wrench"></span> 重命名文件夹
					</h4>
				</div>
				<div class="modal-body">
					<form class="form-horizontal">
						<div class="form-group" id="folderrenamebox">
							<label for="folderid" id="foldernametitle"
								class="col-sm-3 control-label">名称：</label>
							<div class="col-sm-9">
								<input type="text" class="form-control" id="newfoldername"
									placeholder="请输入文件夹的名称……">
							</div>
						</div>
						<div id="newfolderalert" role="alert"></div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<span id="renameFolderBox"></span>
				</div>
			</div>
		</div>
	</div>
	<%-- end 修改文件夹模态框 --%>
	<%-- 上传文件模态框 --%>
	<div class="modal fade" id="uploadFileModal" tabindex="-1"
		role="dialog" aria-labelledby="uploadFileMolderTitle">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="uploadFileMolderTitle">
						<span class="glyphicon glyphicon-cloud-upload"></span> 上传文件
					</h4>
				</div>
				<div class="modal-body">
					<h5>选择文件：<span id="selectcount"></span></h5>
					<input type="text" id="filepath" class="form-control"
						onclick="checkpath()" onfocus="this.blur()"
						placeholder="请点击选择要上传的文件……"> <input type="file"
						id="uploadfile" style="display: none;" onchange="showfilepath()"
						multiple="multiple"> <br />
					<h5>
						上传进度：<span id="filecount"></span>
					</h5>
					<div class="progress">
						<div id="pros" class="progress-bar" role="progressbar"
							aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
							style="width: 0%;">
							<span class="sr-only"></span>
						</div>
					</div>
					<h5>上传状态：</h5>
					<div class="panel panel-default">
						<div class="panel-body">
							<div id="uploadstatus" class="uploadstatusbox"></div>
						</div>
					</div>
					<div id="uploadFileAlert" role="alert"></div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default"
						onclick='abortUpload()'>取消</button>
					<button id="umbutton" type='button' class='btn btn-primary'
						onclick='checkUploadFile()'>开始上传</button>
				</div>
			</div>
		</div>
	</div>
	<%-- end 上传文件模态框 --%>
	<%-- 下载模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="downloadModal"
		tabindex="-1" role="dialog" aria-labelledby="downloadModelTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="downloadModelTitle">
						<span class="glyphicon glyphicon-cloud-download"></span> 下载
					</h4>
				</div>
				<div class="modal-body">
					<h5 id="downloadFileName">提示：您确认要下载文件：[]么？</h5>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<span id="downloadFileBox"></span>
				</div>
			</div>
		</div>
	</div>
	<%-- end 下载模态框 --%>
	<%-- 删除文件模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="deleteFileModal"
		tabindex="-1" role="dialog" aria-labelledby="deleteFileModelTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="deleteFileModelTitle">
						<span class="glyphicon glyphicon-comment"></span> 删除文件
					</h4>
				</div>
				<div class="modal-body">
					<h5 id="deleteFileMessage"></h5>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<span id="deleteFileBox"></span>
				</div>
			</div>
		</div>
	</div>
	<%-- end 删除文件模态框 --%>
	<%-- 修改文件名模态框 --%>
	<div class="modal fade bs-example-modal-sm" id="renameFileModal"
		tabindex="-1" role="dialog" aria-labelledby="renameFileMolderTitle">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title" id="renameFileMolderTitle">
						<span class="glyphicon glyphicon-wrench"></span> 重命名文件
					</h4>
				</div>
				<div class="modal-body">
					<form class="form-horizontal">
						<div class="form-group" id="filerenamebox">
							<label for="folderid" id="filenametitle"
								class="col-sm-3 control-label">名称：</label>
							<div class="col-sm-9">
								<input type="text" class="form-control" id="newfilename"
									placeholder="请输入文件的名称……">
							</div>
						</div>
						<div id="newFileNamealert" role="alert"></div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
					<span id="renameFileBox"></span>
				</div>
			</div>
		</div>
	</div>
	<%-- end 修改文件夹模态框 --%>
</body>
<script type="text/javascript" src="js/jquery-3.3.1.min.js"></script>
<script type="text/javascript" src="js/bootstrap.min.js"></script>
<script type="text/javascript" src="js/home.min.js"></script>
</html>