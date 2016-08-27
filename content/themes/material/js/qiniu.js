function QiniuJsSDK() {
    this.detectIEVersion = function() {
        var v = 4, div = document.createElement("div"), all = div.getElementsByTagName("i");
        while (div.innerHTML = "", all[0]) {
            v++;
        }
        return v > 4 ? v :false;
    };
    this.isImage = function(url) {
        var res, suffix = "";
        var imageSuffixes = [ "png", "jpg", "jpeg", "gif", "bmp" ];
        var suffixMatch = /\.([a-zA-Z0-9]+)(\?|\@|$)/;
        if (!url || !suffixMatch.test(url)) {
            return false;
        }
        res = suffixMatch.exec(url);
        suffix = res[1].toLowerCase();
        for (var i = 0, l = imageSuffixes.length; i < l; i++) {
            if (suffix === imageSuffixes[i]) {
                return true;
            }
        }
        return false;
    };
    this.getFileExtension = function(filename) {
        var tempArr = filename.split(".");
        var ext;
        if (tempArr.length === 1 || tempArr[0] === "" && tempArr.length === 2) {
            ext = "";
        } else {
            ext = tempArr.pop().toLowerCase();
        }
        return ext;
    };
    this.utf8_encode = function(argString) {
        if (argString === null || typeof argString === "undefined") {
            return "";
        }
        var string = argString + "";
        var utftext = "", start, end, stringl = 0;
        start = end = 0;
        stringl = string.length;
        for (var n = 0; n < stringl; n++) {
            var c1 = string.charCodeAt(n);
            var enc = null;
            if (c1 < 128) {
                end++;
            } else if (c1 > 127 && c1 < 2048) {
                enc = String.fromCharCode(c1 >> 6 | 192, c1 & 63 | 128);
            } else if (c1 & 63488 ^ 55296 > 0) {
                enc = String.fromCharCode(c1 >> 12 | 224, c1 >> 6 & 63 | 128, c1 & 63 | 128);
            } else {
                if (c1 & 64512 ^ 55296 > 0) {
                    throw new RangeError("Unmatched trail surrogate at " + n);
                }
                var c2 = string.charCodeAt(++n);
                if (c2 & 64512 ^ 56320 > 0) {
                    throw new RangeError("Unmatched lead surrogate at " + (n - 1));
                }
                c1 = ((c1 & 1023) << 10) + (c2 & 1023) + 65536;
                enc = String.fromCharCode(c1 >> 18 | 240, c1 >> 12 & 63 | 128, c1 >> 6 & 63 | 128, c1 & 63 | 128);
            }
            if (enc !== null) {
                if (end > start) {
                    utftext += string.slice(start, end);
                }
                utftext += enc;
                start = end = n + 1;
            }
        }
        if (end > start) {
            utftext += string.slice(start, stringl);
        }
        return utftext;
    };
    this.base64_encode = function(data) {
        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
        if (!data) {
            return data;
        }
        data = this.utf8_encode(data + "");
        do {
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);
            bits = o1 << 16 | o2 << 8 | o3;
            h1 = bits >> 18 & 63;
            h2 = bits >> 12 & 63;
            h3 = bits >> 6 & 63;
            h4 = bits & 63;
            tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);
        enc = tmp_arr.join("");
        switch (data.length % 3) {
          case 1:
            enc = enc.slice(0, -2) + "==";
            break;

          case 2:
            enc = enc.slice(0, -1) + "=";
            break;
        }
        return enc;
    };
    this.URLSafeBase64Encode = function(v) {
        v = this.base64_encode(v);
        return v.replace(/\//g, "_").replace(/\+/g, "-");
    };
    this.createAjax = function(argument) {
        var xmlhttp = {};
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        return xmlhttp;
    };
    this.parseJSON = function(data) {
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data);
        }
        if (data === null) {
            return data;
        }
        if (typeof data === "string") {
            data = this.trim(data);
            if (data) {
                if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g, "@").replace(/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
                    return function() {
                        return data;
                    }();
                }
            }
        }
    };
    this.trim = function(text) {
        return text === null ? "" :this.trim.call(text);
    };
    var that = this;
    this.uploader = function(op) {
        if (!op.domain) {
            throw "uptoken_url or domain is required!";
        }
        if (!op.browse_button) {
            throw "browse_button is required!";
        }
        var option = {};
        var _Error_Handler = op.init && op.init.Error;
        var _FileUploaded_Handler = op.init && op.init.FileUploaded;
        op.init.Error = function() {};
        op.init.FileUploaded = function() {};
        that.uptoken_url = op.uptoken_url;
        that.token = "";
        that.key_handler = typeof op.init.Key === "function" ? op.init.Key :"";
        this.domain = op.domain;
        var ctx = "";
        var reset_chunk_size = function() {
            var ie = that.detectIEVersion();
            var BLOCK_BITS, MAX_CHUNK_SIZE, chunk_size;
            var isSpecialSafari = mOxie.Env.browser === "Safari" && mOxie.Env.version <= 5 && mOxie.Env.os === "Windows" && mOxie.Env.osVersion === "7" || mOxie.Env.browser === "Safari" && mOxie.Env.os === "iOS" && mOxie.Env.osVersion === "7";
            if (ie && ie <= 9 && op.chunk_size && op.runtimes.indexOf("flash") >= 0) {
                op.chunk_size = 0;
            } else if (isSpecialSafari) {
                op.chunk_size = 0;
            } else {
                BLOCK_BITS = 20;
                MAX_CHUNK_SIZE = 4 << BLOCK_BITS;
                chunk_size = plupload.parseSize(op.chunk_size);
                if (chunk_size > MAX_CHUNK_SIZE) {
                    op.chunk_size = MAX_CHUNK_SIZE;
                }
            }
        };
        reset_chunk_size();
        var getUpToken = function() {
            if (!op.uptoken) {
                var ajax = that.createAjax();
                ajax.open("GET", that.uptoken_url, true);
                ajax.setRequestHeader("If-Modified-Since", "0");
                ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4 && ajax.status === 200) {
                        var res = that.parseJSON(ajax.responseText);
                        if(policyType == "oss"){
	                        that.policy = res.policy;
	                        that.signature = res.signature;
	                        that.AccessKeyId = res.AccessKeyId;
	                    }else if(policyType == "upyun"){
	                    	that.policy = res.policy;
	                    	that.signature = res.signature;
	                    }else{
	                    	that.token = res.uptoken;
	               
	                    }
                    }
                };
                ajax.send();
            } else {
                that.token = op.uptoken;
            }
        };
        var getFileKey = function(up, file, func) {
            var key = "", unique_names = false;
            if (!op.save_key) {
                unique_names = up.getOption && up.getOption("unique_names");
                unique_names = unique_names || up.settings && up.settings.unique_names;
                if (unique_names) {
                    var ext = that.getFileExtension(file.name);
                    key = ext ? file.id + "." + ext :file.id;
                } else if (typeof func === "function") {
                    key = func(up, file);
                } else {
                    key = file.name;
                }
            }
            return key;
        };
        plupload.extend(option, op, {
            url:"https://up.qbox.me",
            multipart_params:{
                token:""
            }
        });
        var uploader = new plupload.Uploader(option);
        uploader.bind("Init", function(up, params) {
            getUpToken();
        });
        uploader.init();
        uploader.bind("FilesAdded", function(up, files) {
            var auto_start = up.getOption && up.getOption("auto_start");
            auto_start = auto_start || up.settings && up.settings.auto_start;
            if (auto_start) {
                $.each(files, function(i, file) {
                    up.start();
                });
            }
            up.refresh();
        });
        uploader.bind("BeforeUpload", function(up, file) {
            ctx = "";
            var directUpload = function(up, file, func) {
                var multipart_params_obj;
                if(policyType == "oss"){
                	 osskey = getFileKey(up, file, func);
                	 multipart_params_obj = {

	                        policy:that.policy,
	                        signature:that.signature,
	                        OSSAccessKeyId:that.AccessKeyId,
	                         key:getFileKey(up, file, func),
	                         success_action_status:'200'
	                    };
                }else if (policyType == "upyun"){
                	multipart_params_obj = {
	                        policy:that.policy,
	                        signature:that.signature,
	                    };

                }else{
	                if (op.save_key) {
	                    multipart_params_obj = {
	                        token:that.token,
	                        
	                    };
	                } else {
	                    multipart_params_obj = {
	                        key:getFileKey(up, file, func),
	                        token:that.token,
	                        
	                    };
	                }
	            }
                var x_vars = op.x_vars;
                if (x_vars !== undefined && typeof x_vars === "object") {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === "function") {
                                multipart_params_obj["x:" + x_key] = x_vars[x_key](up, file);
                            } else if (typeof x_vars[x_key] !== "object") {
                                multipart_params_obj["x:" + x_key] = x_vars[x_key];
                            }
                        }
                    }
                }
                up.setOption({
                    url:upserver,
                    multipart:true,
                    chunk_size:undefined,
                    multipart_params:multipart_params_obj
                });
            };
            var chunk_size = up.getOption && up.getOption("chunk_size");
            chunk_size = chunk_size || up.settings && up.settings.chunk_size;
            if (uploader.runtime === "html5" && chunk_size) {
                if (file.size < chunk_size) {
                    directUpload(up, file, that.key_handler);
                } else {
                    var localFileInfo = localStorage.getItem(file.name);
                    var blockSize = chunk_size;
                    if (localFileInfo) {
                        localFileInfo = JSON.parse(localFileInfo);
                        var now = new Date().getTime();
                        var before = localFileInfo.time || 0;
                        var aDay = 24 * 60 * 60 * 1e3;
                        if (now - before < aDay) {
                            if (localFileInfo.percent !== 100) {
                                file.percent = localFileInfo.percent;
                                file.loaded = localFileInfo.offset;
                                ctx = localFileInfo.ctx;
                                if (localFileInfo.offset + blockSize > file.size) {
                                    blockSize = file.size - localFileInfo.offset;
                                }
                            } else {
                                localStorage.removeItem(file.name);
                            }
                        } else {
                            localStorage.removeItem(file.name);
                        }
                    }
                    up.setOption({
                        url:"https://up.qbox.me/mkblk/" + blockSize,
                        multipart:false,
                        chunk_size:chunk_size,
                        required_features:"chunks",
                        headers:{
                            Authorization:"UpToken " + that.token
                        },
                        multipart_params:{}
                    });
                }
            } else {
                directUpload(up, file, that.key_handler);
            }
        });
        uploader.bind("ChunkUploaded", function(up, file, info) {
            var res = that.parseJSON(info.response);
            ctx = ctx ? ctx + "," + res.ctx :res.ctx;
            var leftSize = info.total - info.offset;
            var chunk_size = up.getOption && up.getOption("chunk_size");
            chunk_size = chunk_size || up.settings && up.settings.chunk_size;
            if (leftSize < chunk_size) {
                up.setOption({
                    url:"https://up.qbox.me/mkblk/" + leftSize
                });
            }
            localStorage.setItem(file.name, JSON.stringify({
                ctx:ctx,
                percent:file.percent,
                total:info.total,
                offset:info.offset,
                time:new Date().getTime()
            }));
        });
        uploader.bind("Error", function(_Error_Handler) {
            return function(up, err) {
                var errTip = "";
                var file = err.file;
                if (file) {
                    switch (err.code) {
                      case plupload.FAILED:
                        errTip = "上传失败。请稍后再试。";
                        break;

                      case plupload.FILE_SIZE_ERROR:
                        var max_file_size = up.getOption && up.getOption("max_file_size");
                        max_file_size = max_file_size || up.settings && up.settings.max_file_size;
                        errTip = "文件尺寸过大,请重新选择。";
                        break;

                      case plupload.FILE_EXTENSION_ERROR:
                        errTip = "文件类型不被允许，请重新选择";
                        break;

                      case plupload.HTTP_ERROR:
                      if(policyType == "oss"){
                      
				            var errorText = "云端验证失败";
				        
					


                      }else{
                      	var errorObj = that.parseJSON(err.response);
                        var errorText = errorObj.error;
                      }
                        
                        switch (err.status) {
                          case 400:
                            errTip = "请求报文格式错误。";
                            break;

                          case 401:
                            errTip = "客户端认证授权失败。请重试或提交反馈。";
                            break;

                          case 405:
                            errTip = "客户端请求错误。请重试或提交反馈。";
                            break;

                          case 579:
                            errTip = "资源上传成功，但回调失败。";
                            break;

                          case 599:
                            errTip = "网络连接异常。请重试或提交反馈。";
                            break;

                          case 614:
                            errTip = "文件已存在。";
                            try {
                                errorObj = that.parseJSON(errorObj.error);
                                errorText = errorObj.error || "file exists";
                            } catch (e) {
                                errorText = errorObj.error || "file exists";
                            }
                            break;

                          case 631:
                            errTip = "指定空间不存在。";
                            break;

                          case 701:
                            errTip = "上传数据块校验出错。请重试或提交反馈。";
                            break;

                          default:
                            errTip = "未知错误。";
                            break;
                        }
                        errTip = errTip + "(" + err.status + "：" + errorText + ")";
                        break;

                      case plupload.SECURITY_ERROR:
                        errTip = "安全配置错误。请联系网站管理员。";
                        break;

                      case plupload.GENERIC_ERROR:
                        errTip = "上传失败。请稍后再试。";
                        break;

                      case plupload.IO_ERROR:
                        errTip = "上传失败。请稍后再试。";
                        break;

                      case plupload.INIT_ERROR:
                        errTip = "网站配置错误。请联系网站管理员。";
                        uploader.destroy();
                        break;

                      default:
                        errTip = err.message + err.details;
                        break;
                    }
                    if (_Error_Handler) {
                        _Error_Handler(up, err, errTip);
                    }
                }
                up.refresh();
            };
        }(_Error_Handler));
        uploader.bind("FileUploaded", function(_FileUploaded_Handler) {
            return function(up, file, info) {
                var last_step = function(up, file, info) {
                    if (op.downtoken_url) {
                        var ajax_downtoken = that.createAjax();
                        ajax_downtoken.open("POST", op.downtoken_url, true);
                        ajax_downtoken.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                        ajax_downtoken.onreadystatechange = function() {
                            if (ajax_downtoken.readyState === 4) {
                                if (ajax_downtoken.status === 200) {
                                    var res_downtoken;
                                    try {
                                        res_downtoken = that.parseJSON(ajax_downtoken.responseText);
                                    } catch (e) {
                                        throw "invalid json format";
                                    }
                                    var info_extended = {};
                                    plupload.extend(info_extended, that.parseJSON(info), res_downtoken);
                                    if (_FileUploaded_Handler) {
                                        _FileUploaded_Handler(up, file, JSON.stringify(info_extended));
                                    }
                                } else {
                                    uploader.trigger("Error", {
                                        status:ajax_downtoken.status,
                                        response:ajax_downtoken.responseText,
                                        file:file,
                                        code:plupload.HTTP_ERROR
                                    });
                                }
                            }
                        };
                        ajax_downtoken.send("key=" + that.parseJSON(info).key + "&domain=" + op.domain);
                    } else if (_FileUploaded_Handler) {
                        _FileUploaded_Handler(up, file, info);
                    }
                };
                var res = that.parseJSON(info.response);
                ctx = ctx ? ctx :res.ctx;
                if (ctx) {
                    var key = "";
                    if (!op.save_key) {
                        key = getFileKey(up, file, that.key_handler);
                        key = key ? "/key/" + that.URLSafeBase64Encode(key) :"";
                    }
                    var x_vars = op.x_vars, x_val = "", x_vars_url = "";
                    if (x_vars !== undefined && typeof x_vars === "object") {
                        for (var x_key in x_vars) {
                            if (x_vars.hasOwnProperty(x_key)) {
                                if (typeof x_vars[x_key] === "function") {
                                    x_val = that.URLSafeBase64Encode(x_vars[x_key](up, file));
                                } else if (typeof x_vars[x_key] !== "object") {
                                    x_val = that.URLSafeBase64Encode(x_vars[x_key]);
                                }
                                x_vars_url += "/x:" + x_key + "/" + x_val;
                            }
                        }
                    }
                    var url = "https://up.qbox.me/mkfile/" + file.size + key + x_vars_url;
                    var ajax = that.createAjax();
                    ajax.open("POST", url, true);
                    ajax.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
                    ajax.setRequestHeader("Authorization", "UpToken " + that.token);
                    ajax.onreadystatechange = function() {
                        if (ajax.readyState === 4) {
                            localStorage.removeItem(file.name);
                            if (ajax.status === 200) {
                                var info = ajax.responseText;
                                last_step(up, file, info);
                            } else {
                                uploader.trigger("Error", {
                                    status:ajax.status,
                                    response:ajax.responseText,
                                    file:file,
                                    code:-200
                                });
                            }
                        }
                    };
                    ajax.send(ctx);
                } else {
                    last_step(up, file, info.response);
                }
            };
        }(_FileUploaded_Handler));
        return uploader;
    };
    this.getUrl = function(key) {
        if (!key) {
            return false;
        }
        key = encodeURI(key);
        var domain = this.domain;
        if (domain.slice(domain.length - 1) !== "/") {
            domain = domain + "/";
        }
        return domain + key;
    };
    this.imageView2 = function(op, key) {
        var mode = op.mode || "", w = op.w || "", h = op.h || "", q = op.quality || "", format = op.format || "";
        if (!mode) {
            return false;
        }
        if (!w && !h) {
            return false;
        }
        var imageUrl = "imageView2/" + mode;
        imageUrl += w ? "/w/" + w :"";
        imageUrl += h ? "/h/" + h :"";
        imageUrl += q ? "/q/" + q :"";
        imageUrl += format ? "/format/" + format :"";
        if (key) {
            imageUrl = this.getUrl(key) + "?" + imageUrl;
        }
        return imageUrl;
    };
    this.imageMogr2 = function(op, key) {
        var auto_orient = op["auto-orient"] || "", thumbnail = op.thumbnail || "", strip = op.strip || "", gravity = op.gravity || "", crop = op.crop || "", quality = op.quality || "", rotate = op.rotate || "", format = op.format || "", blur = op.blur || "";
        var imageUrl = "imageMogr2";
        imageUrl += auto_orient ? "/auto-orient" :"";
        imageUrl += thumbnail ? "/thumbnail/" + thumbnail :"";
        imageUrl += strip ? "/strip" :"";
        imageUrl += gravity ? "/gravity/" + gravity :"";
        imageUrl += quality ? "/quality/" + quality :"";
        imageUrl += crop ? "/crop/" + crop :"";
        imageUrl += rotate ? "/rotate/" + rotate :"";
        imageUrl += format ? "/format/" + format :"";
        imageUrl += blur ? "/blur/" + blur :"";
        if (key) {
            imageUrl = this.getUrl(key) + "?" + imageUrl;
        }
        return imageUrl;
    };
    this.watermark = function(op, key) {
        var mode = op.mode;
        if (!mode) {
            return false;
        }
        var imageUrl = "watermark/" + mode;
        if (mode === 1) {
            var image = op.image || "";
            if (!image) {
                return false;
            }
            imageUrl += image ? "/image/" + this.URLSafeBase64Encode(image) :"";
        } else if (mode === 2) {
            var text = op.text ? op.text :"", font = op.font ? op.font :"", fontsize = op.fontsize ? op.fontsize :"", fill = op.fill ? op.fill :"";
            if (!text) {
                return false;
            }
            imageUrl += text ? "/text/" + this.URLSafeBase64Encode(text) :"";
            imageUrl += font ? "/font/" + this.URLSafeBase64Encode(font) :"";
            imageUrl += fontsize ? "/fontsize/" + fontsize :"";
            imageUrl += fill ? "/fill/" + this.URLSafeBase64Encode(fill) :"";
        } else {
            return false;
        }
        var dissolve = op.dissolve || "", gravity = op.gravity || "", dx = op.dx || "", dy = op.dy || "";
        imageUrl += dissolve ? "/dissolve/" + dissolve :"";
        imageUrl += gravity ? "/gravity/" + gravity :"";
        imageUrl += dx ? "/dx/" + dx :"";
        imageUrl += dy ? "/dy/" + dy :"";
        if (key) {
            imageUrl = this.getUrl(key) + "?" + imageUrl;
        }
        return imageUrl;
    };
    this.imageInfo = function(key) {
        if (!key) {
            return false;
        }
        var url = this.getUrl(key) + "?imageInfo";
        var xhr = this.createAjax();
        var info;
        var that = this;
        xhr.open("GET", url, false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                info = that.parseJSON(xhr.responseText);
            }
        };
        xhr.send();
        return info;
    };
    this.exif = function(key) {
        if (!key) {
            return false;
        }
        var url = this.getUrl(key) + "?exif";
        var xhr = this.createAjax();
        var info;
        var that = this;
        xhr.open("GET", url, false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                info = that.parseJSON(xhr.responseText);
            }
        };
        xhr.send();
        return info;
    };
    this.get = function(type, key) {
        if (!key || !type) {
            return false;
        }
        if (type === "exif") {
            return this.exif(key);
        } else if (type === "imageInfo") {
            return this.imageInfo(key);
        }
        return false;
    };
    this.pipeline = function(arr, key) {
        var isArray = Object.prototype.toString.call(arr) === "[object Array]";
        var option, errOp, imageUrl = "";
        if (isArray) {
            for (var i = 0, len = arr.length; i < len; i++) {
                option = arr[i];
                if (!option.fop) {
                    return false;
                }
                switch (option.fop) {
                  case "watermark":
                    imageUrl += this.watermark(option) + "|";
                    break;

                  case "imageView2":
                    imageUrl += this.imageView2(option) + "|";
                    break;

                  case "imageMogr2":
                    imageUrl += this.imageMogr2(option) + "|";
                    break;

                  default:
                    errOp = true;
                    break;
                }
                if (errOp) {
                    return false;
                }
            }
            if (key) {
                imageUrl = this.getUrl(key) + "?" + imageUrl;
                var length = imageUrl.length;
                if (imageUrl.slice(length - 1) === "|") {
                    imageUrl = imageUrl.slice(0, length - 1);
                }
            }
            return imageUrl;
        }
        return false;
    };
}

var Qiniu = new QiniuJsSDK();
function base64_decode(str){
                var c1, c2, c3, c4;
                var base64DecodeChars = new Array(
                        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
                        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
                        -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57,
                        58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0,  1,  2,  3,  4,  5,  6,
                        7,  8,  9,  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
                        25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
                        37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1,
                        -1, -1
                );
                var i=0, len = str.length, string = '';

                while (i < len){
                        do{
                                c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
                        } while (
                                i < len && c1 == -1
                        );

                        if (c1 == -1) break;

                        do{
                                c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
                        } while (
                                i < len && c2 == -1
                        );

                        if (c2 == -1) break;

                        string += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

                        do{
                                c3 = str.charCodeAt(i++) & 0xff;
                                if (c3 == 61)
                                        return string;

                                c3 = base64DecodeChars[c3]
                        } while (
                                i < len && c3 == -1
                        );

                        if (c3 == -1) break;

                        string += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));

                        do{
                                c4 = str.charCodeAt(i++) & 0xff;
                                if (c4 == 61) return string;
                                c4 = base64DecodeChars[c4]
                        } while (
                                i < len && c4 == -1
                        );

                        if (c4 == -1) break;

                        string += String.fromCharCode(((c3 & 0x03) << 6) | c4)
                }
                return string;
        }