package kohgylw.kiftd.server.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import org.springframework.stereotype.Service;

import com.google.gson.Gson;

import kohgylw.kiftd.server.enumeration.AccountAuth;
import kohgylw.kiftd.server.mapper.FolderMapper;
import kohgylw.kiftd.server.mapper.NodeMapper;
import kohgylw.kiftd.server.model.Folder;
import kohgylw.kiftd.server.model.Node;
import kohgylw.kiftd.server.pojo.FolderView;
import kohgylw.kiftd.server.pojo.RemainingFolderView;
import kohgylw.kiftd.server.pojo.SreachView;
import kohgylw.kiftd.server.service.FolderViewService;
import kohgylw.kiftd.server.util.ConfigureReader;
import kohgylw.kiftd.server.util.FolderUtil;
import kohgylw.kiftd.server.util.KiftdFFMPEGLocator;
import kohgylw.kiftd.server.util.ServerTimeUtil;

@Service
public class FolderViewServiceImpl implements FolderViewService {

	private static int SELECT_STEP = 256;// 每次查询的文件或文件夹的最大限额，即查询步进长度

	@Resource
	private FolderUtil fu;
	@Resource
	private FolderMapper fm;
	@Resource
	private NodeMapper flm;
	@Resource
	private Gson gson;
	@Resource
	private KiftdFFMPEGLocator kfl;

	@Override
	public String getFolderViewToJson(final String fid, final HttpSession session, final HttpServletRequest request) {
		final ConfigureReader cr = ConfigureReader.instance();
		if (fid == null || fid.length() == 0) {
			return "ERROR";
		}
		Folder vf = this.fm.queryById(fid);
		if (vf == null) {
			return "NOT_FOUND";// 如果用户请求一个不存在的文件夹，则返回“NOT_FOUND”，令页面回到ROOT视图
		}
		final String account = (String) session.getAttribute("ACCOUNT");
		// 检查访问文件夹视图请求是否合法
		if (!ConfigureReader.instance().accessFolder(vf, account)) {
			return "notAccess";// 如无访问权限则直接返回该字段，令页面回到ROOT视图。
		}
		final FolderView fv = new FolderView();
		fv.setSelectStep(SELECT_STEP);// 返回查询步长
		fv.setFolder(vf);
		fv.setParentList(this.fu.getParentList(fid));
		long foldersOffset = this.fm.countByParentId(fid);// 第一波文件夹数据按照最后的记录作为查询偏移量
		fv.setFoldersOffset(foldersOffset);
		Map<String, Object> keyMap1 = new HashMap<>();
		keyMap1.put("pid", fid);
		long fOffset = foldersOffset - SELECT_STEP;
		keyMap1.put("offset", fOffset > 0L ? fOffset : 0L);// 进行查询
		keyMap1.put("rows", SELECT_STEP);
		List<Folder> folders = this.fm.queryByParentIdSection(keyMap1);
		List<Folder> fs = new LinkedList<>();
		for (Folder f : folders) {
			if (ConfigureReader.instance().accessFolder(f, account)) {
				f.setFileList(getFolderViewToJson2(f.getFolderId(),session,request));
				fs.add(f);
			}
		}
		fv.setFolderList(fs);
		long filesOffset = this.flm.countByParentFolderId(fid);// 文件的查询逻辑与文件夹基本相同
		fv.setFilesOffset(filesOffset);
		Map<String, Object> keyMap2 = new HashMap<>();
		keyMap2.put("pfid", fid);
		long fiOffset = filesOffset - SELECT_STEP;
		keyMap2.put("offset", fiOffset > 0L ? fiOffset : 0L);
		keyMap2.put("rows", SELECT_STEP);
		fv.setFileList(this.flm.queryByParentFolderIdSection(keyMap2));
		if (account != null) {
			fv.setAccount(account);
		}
		if (ConfigureReader.instance().isAllowChangePassword()) {
			fv.setAllowChangePassword("true");
		} else {
			fv.setAllowChangePassword("false");
		}
		if (ConfigureReader.instance().isAllowSignUp()) {
			fv.setAllowSignUp("true");
		} else {
			fv.setAllowSignUp("false");
		}
		final List<String> authList = new ArrayList<String>();
		if (cr.authorized(account, AccountAuth.UPLOAD_FILES, fu.getAllFoldersId(fid))) {
			authList.add("U");
		}
		if (cr.authorized(account, AccountAuth.CREATE_NEW_FOLDER, fu.getAllFoldersId(fid))) {
			authList.add("C");
		}
		if (cr.authorized(account, AccountAuth.DELETE_FILE_OR_FOLDER, fu.getAllFoldersId(fid))) {
			authList.add("D");
		}
		if (cr.authorized(account, AccountAuth.RENAME_FILE_OR_FOLDER, fu.getAllFoldersId(fid))) {
			authList.add("R");
		}
		if (cr.authorized(account, AccountAuth.DOWNLOAD_FILES, fu.getAllFoldersId(fid))) {
			authList.add("L");
			if (cr.isOpenFileChain()) {
				fv.setShowFileChain("true");// 显示永久资源链接
			} else {
				fv.setShowFileChain("false");
			}
		}
		if (cr.authorized(account, AccountAuth.MOVE_FILES, fu.getAllFoldersId(fid))) {
			authList.add("M");
		}
		fv.setAuthList(authList);
		fv.setPublishTime(ServerTimeUtil.accurateToMinute());
		fv.setEnableFFMPEG(kfl.isEnableFFmpeg());
		fv.setEnableDownloadZip(ConfigureReader.instance().isEnableDownloadByZip());
		return gson.toJson(fv);
	}
	
	
	public Map<String, Object> getFolderViewToJson2(final String fid, final HttpSession session, final HttpServletRequest request) {
		
		Map<String, Object> map = new HashMap<>();
		
		
		final String account = (String) session.getAttribute("ACCOUNT");
		// 检查访问文件夹视图请求是否合法
		long foldersOffset = this.fm.countByParentId(fid);// 第一波文件夹数据按照最后的记录作为查询偏移量
		Map<String, Object> keyMap1 = new HashMap<>();
		keyMap1.put("pid", fid);
		long fOffset = foldersOffset - SELECT_STEP;
		keyMap1.put("offset", fOffset > 0L ? fOffset : 0L);// 进行查询
		keyMap1.put("rows", SELECT_STEP);
		List<Folder> folders = this.fm.queryByParentIdSection(keyMap1);
		List<Folder> fs = new LinkedList<>();
		for (Folder f : folders) {
			if (ConfigureReader.instance().accessFolder(f, account)) {
				fs.add(f);
			}
		}
		map.put("folders", fs.size());
		 
		long filesOffset = this.flm.countByParentFolderId(fid);// 文件的查询逻辑与文件夹基本相同
		Map<String, Object> keyMap2 = new HashMap<>();
		keyMap2.put("pfid", fid);
		long fiOffset = filesOffset - SELECT_STEP;
		keyMap2.put("offset", fiOffset > 0L ? fiOffset : 0L);
		keyMap2.put("rows", SELECT_STEP);
		
		map.put("filelist", this.flm.queryByParentFolderIdSection(keyMap2).size());
		
		return map;
	}
	

	@Override
	public String getSreachViewToJson(HttpServletRequest request) {
		final ConfigureReader cr = ConfigureReader.instance();
		String fid = request.getParameter("fid");
		String keyWorld = request.getParameter("keyworld");
		if (fid == null || fid.length() == 0 || keyWorld == null) {
			return "ERROR";
		}
		// 如果啥么也不查，那么直接返回指定文件夹标准视图
		if (keyWorld.length() == 0) {
			return getFolderViewToJson(fid, request.getSession(), request);
		}
		Folder vf = this.fm.queryById(fid);
		final String account = (String) request.getSession().getAttribute("ACCOUNT");
		// 检查访问文件夹视图请求是否合法
		if (!ConfigureReader.instance().accessFolder(vf, account)) {
			return "notAccess";// 如无访问权限则直接返回该字段，令页面回到ROOT视图。
		}
		final SreachView sv = new SreachView();
		// 先准备搜索视图的文件夹信息
		Folder sf = new Folder();
		sf.setFolderId(vf.getFolderId());// 搜索视图的主键设置与搜索路径一致
		sf.setFolderName("在“" + vf.getFolderName() + "”内搜索“" + keyWorld + "”的结果...");// 名称就是搜索的描述
		sf.setFolderParent(vf.getFolderId());// 搜索视图的父级也与搜索路径一致
		sf.setFolderCreator("--");// 搜索视图是虚拟的，没有这些
		sf.setFolderCreationDate("--");
		sf.setFolderConstraint(vf.getFolderConstraint());// 其访问等级也与搜索路径一致
		sv.setFolder(sf);// 搜索视图的文件夹信息已经准备就绪
		// 设置上级路径为搜索路径
		List<Folder> pl = this.fu.getParentList(fid);
		pl.add(vf);
		sv.setParentList(pl);
		// 设置所有搜索到的文件夹和文件，该方法迭查找：
		List<Node> ns = new LinkedList<>();
		List<Folder> fs = new LinkedList<>();
		sreachFilesAndFolders(fid, keyWorld, account, ns, fs);
		sv.setFileList(ns);
		sv.setFolderList(fs);
		// 搜索不支持分段加载，所以统计数据直接写入实际查询到的列表大小
		sv.setFoldersOffset(0L);
		sv.setFilesOffset(0L);
		sv.setSelectStep(SELECT_STEP);
		// 账户视图与文件夹相同
		if (account != null) {
			sv.setAccount(account);
		}
		if (ConfigureReader.instance().isAllowChangePassword()) {
			sv.setAllowChangePassword("true");
		} else {
			sv.setAllowChangePassword("false");
		}
		// 设置操作权限，对于搜索视图而言，只能进行下载操作（因为是虚拟的）
		final List<String> authList = new ArrayList<String>();
		// 搜索结果只接受“下载”操作
		if (cr.authorized(account, AccountAuth.DOWNLOAD_FILES, fu.getAllFoldersId(fid))) {
			authList.add("L");
			if (cr.isOpenFileChain()) {
				sv.setShowFileChain("true");// 显示永久资源链接
			} else {
				sv.setShowFileChain("false");
			}
		}
		// 同时额外具备普通文件夹没有的“定位”功能。
		authList.add("O");
		sv.setAuthList(authList);
		// 写入实时系统时间
		sv.setPublishTime(ServerTimeUtil.accurateToMinute());
		// 设置查询字段
		sv.setKeyWorld(keyWorld);
		// 返回公告MD5
		sv.setEnableFFMPEG(kfl.isEnableFFmpeg());
		sv.setEnableDownloadZip(ConfigureReader.instance().isEnableDownloadByZip());
		return gson.toJson(sv);
	}

	// 迭代查找所有匹配项，参数分别是：从哪找、找啥、谁要找、添加的前缀是啥（便于分辨不同路径下的同名文件）、找到的文件放哪、找到的文件夹放哪
	private void sreachFilesAndFolders(String fid, String key, String account, List<Node> ns, List<Folder> fs) {
		for (Folder f : this.fm.queryByParentId(fid)) {
			if (ConfigureReader.instance().accessFolder(f, account)) {
				if (f.getFolderName().indexOf(key) >= 0) {
					f.setFolderName(f.getFolderName());
					fs.add(f);
				}
				sreachFilesAndFolders(f.getFolderId(), key, account, ns, fs);
			}
		}
		for (Node n : this.flm.queryByParentFolderId(fid)) {
			if (n.getFileName().indexOf(key) >= 0) {
				n.setFileName(n.getFileName());
				ns.add(n);
			}
		}
	}

	@Override
	public String getRemainingFolderViewToJson(HttpServletRequest request) {
		final String fid = request.getParameter("fid");
		final String foldersOffset = request.getParameter("foldersOffset");
		final String filesOffset = request.getParameter("filesOffset");
		if (fid == null || fid.length() == 0) {
			return "ERROR";
		}
		Folder vf = this.fm.queryById(fid);
		if (vf == null) {
			return "NOT_FOUND";// 如果用户请求一个不存在的文件夹，则返回“NOT_FOUND”，令页面回到ROOT视图
		}
		final String account = (String) request.getSession().getAttribute("ACCOUNT");
		// 检查访问文件夹视图请求是否合法
		if (!ConfigureReader.instance().accessFolder(vf, account)) {
			return "notAccess";// 如无访问权限则直接返回该字段，令页面回到ROOT视图。
		}
		final RemainingFolderView fv = new RemainingFolderView();
		if (foldersOffset != null) {
			try {
				long newFoldersOffset = Long.parseLong(foldersOffset);
				if (newFoldersOffset > 0L) {
					Map<String, Object> keyMap1 = new HashMap<>();
					keyMap1.put("pid", fid);
					long nfOffset = newFoldersOffset - SELECT_STEP;
					keyMap1.put("offset", nfOffset > 0L ? nfOffset : 0L);
					keyMap1.put("rows", nfOffset > 0L ? SELECT_STEP : newFoldersOffset);
					List<Folder> folders = this.fm.queryByParentIdSection(keyMap1);
					List<Folder> fs = new LinkedList<>();
					for (Folder f : folders) {
						if (ConfigureReader.instance().accessFolder(f, account)) {
							fs.add(f);
						}
					}
					fv.setFolderList(fs);
				}
			} catch (NumberFormatException e) {
				return "ERROR";
			}
		}
		if (filesOffset != null) {
			try {
				long newFilesOffset = Long.parseLong(filesOffset);
				if (newFilesOffset > 0L) {
					Map<String, Object> keyMap2 = new HashMap<>();
					keyMap2.put("pfid", fid);
					long nfiOffset = newFilesOffset - SELECT_STEP;
					keyMap2.put("offset", nfiOffset > 0L ? nfiOffset : 0L);
					keyMap2.put("rows", nfiOffset > 0L ? SELECT_STEP : newFilesOffset);
					fv.setFileList(this.flm.queryByParentFolderIdSection(keyMap2));
				}
			} catch (NumberFormatException e) {
				return "ERROR";
			}
		}
		return gson.toJson(fv);
	}
}
