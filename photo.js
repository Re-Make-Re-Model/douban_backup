// ==UserScript==
// @name          douban_photo_Lib
// @namespace     https://www.douban.com/people/57965364/douban_photo
// @description   douban_photo library
// @include       *
// @match         *
// @version       0.0.1
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// ==/UserScript==
var db;
function downloadPhotos(uid, new_db) {
	tempAlert("开始备份相册");
	db = new_db;
	photosUrl = "https://www.douban.com/people/" + uid + "/photos";
	parsePhotosPage(photosUrl);
}

function parsePhotosPage(url) {
	fetch(url).then(res => res.text())
		.then(text => new DOMParser().parseFromString(text, 'text/html'))
		.then(function (data) {
			var nextUrl;
			if (data.getElementsByClassName("next").length != 0 &&
				data.getElementsByClassName("next")[0].getElementsByTagName("a")[0] != null) {
				nextUrl = data.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
			}
			var albumsLinks = data.getElementsByClassName("albumlst");
			var complete = 0;
			[].forEach.call(albumsLinks, function (alubmLink, index) {
				setTimeout(function () {
					var link = alubmLink.getElementsByTagName("a")[0].getAttribute("href");
					var title = alubmLink.getElementsByTagName("div")[0].getElementsByTagName("div")[0].getElementsByTagName("a")[0].innerText.trim();
					downloadAlbum(link, title, function () {
						complete++;
						if (complete == albumsLinks.length) {
							if (nextUrl != null) {
								parsePhotosPage(nextUrl);
							} else {
								exportAllPhotp();
							}
						}
					});
				}, 1000 * index);
			})
		}, function (error) {
			console.log(error.message);
		})
}

function downloadAlbum(link, title, callback) {
	fetch(link).then(res => res.text())
		.then(text => new DOMParser().parseFromString(text, 'text/html'))
		.then(function (document) {
			var nextUrl;
			if (document.getElementsByClassName("next").length != 0 &&
				document.getElementsByClassName("next")[0].getElementsByTagName("a")[0] != null) {
				nextUrl = document.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
			}
			var photosLinks = document.getElementsByClassName("photo_wrap");
			if (photosLinks.length == 0) {
				if (callback && typeof (callback) === "function")
					callback();
			}
			var complete = 0;
			[].forEach.call(photosLinks, function (photosLink, index) {
				setTimeout(function () {
					var photo_link = photosLink.getElementsByTagName("a")[0].getAttribute("href");
					downloadPhoto(photo_link, title, function () {
						complete++;
						if (complete == photosLinks.length) {
							if (nextUrl != null) {
								downloadAlbum(nextUrl, title, callback);
							} else {
								if (callback && typeof (callback) === "function")
									callback();
							}
						}
					});
				}, 1000 * index);
			})
		}, function (error) {
			console.log(error.message);
		});
}

function downloadPhoto(link, title, callback) {
	var arr = link.split('/');
	var fileTitle = title + "_pid_" + arr.slice(-2, -1);
	fetch(link).then(res => res.text())
		.then(text => new DOMParser().parseFromString(text, 'text/html'))
		.then(function (document) {
			var link;
			if (document.getElementsByClassName('mainphoto')[0]) {
				link = document.getElementsByClassName('mainphoto')[0];
			} else if (document.getElementsByClassName('image-show-inner')[0]) {
				link = document.getElementsByClassName('image-show-inner')[0];
			}
			var imgsrc = link.getElementsByTagName('img')[0].getAttribute('src');
			imgsrc = imgsrc.replace('.webp', '.jpg');
			forceDownload(imgsrc, fileTitle + "." + imgsrc.split('.').pop(), function () {
				const date = document.getElementsByClassName("copyright-claim")[0].getElementsByTagName('p')[0].innerText.trim();
				var desc = "";
				if (document.getElementById("display")) {
					desc = document.getElementById("display").innerText.trim();
				} else if (document.getElementsByClassName("edtext pl")[0]) {
					desc = document.getElementsByClassName("edtext pl")[0].innerText.trim();
				};
				var items = [];
				items.push({
					"album": title,
					"pid": arr.slice(-2, -1),
					"date": date,
					"desc": desc
				});
				db.items.bulkAdd(items);
				if (callback && typeof (callback) === "function")
					callback();
			});
		}, function (error) {
			console.log(error.message);
		});
}

function forceDownload(url, fileName, callback) {
	GM_xmlhttpRequest({
		method: "GET",
		url: url,
		responseType: 'blob',
		onload: function (res) {
			var urlCreator = window.URL || window.webkitURL;
			var imageUrl = urlCreator.createObjectURL(res.response);
			var tag = document.createElement('a');
			tag.href = imageUrl;
			tag.download = fileName;
			document.body.appendChild(tag);
			tag.click();
			document.body.removeChild(tag);
			if (callback && typeof (callback) === "function")
				callback();
		}
	});
}

function exportAllPhotp() {
	db.items.orderBy('album').toArray().then(function (all) {
		all = all.map(function (item, index, array) {
			delete item.id;
			return item;
		})

		JSonToCSV.setDataConver({
			data: all,
			fileName: "豆瓣相册详情",
			columns: {
				title: ['相册名', '图片id', '上传时间', '简介'],
				key: ["album", "pid", "date", "desc"]
			}
		});
		db.delete();
		alert("全部备份完成");
	});
}

// 导出CSV函数
// https://github.com/liqingzheng/pc/blob/master/JsonExportToCSV.js
var JSonToCSV = {
    /*
     * obj是一个对象，其中包含有：
     * ## data 是导出的具体数据
     * ## fileName 是导出时保存的文件名称 是string格式
     * ## showLabel 表示是否显示表头 默认显示 是布尔格式
     * ## columns 是表头对象，且title和key必须一一对应，包含有
          title:[], // 表头展示的文字
          key:[], // 获取数据的Key
          formatter: function() // 自定义设置当前数据的 传入(key, value)
     */
    setDataConver: function (obj) {
        var bw = this.browser();
        if (bw['ie'] < 9) return; // IE9以下的
        var data = obj['data'],
            ShowLabel = typeof obj['showLabel'] === 'undefined' ? true : obj['showLabel'],
            fileName = (obj['fileName'] || 'UserExport') + '.csv',
            columns = obj['columns'] || {
                title: [],
                key: [],
                formatter: undefined
            };
        ShowLabel = typeof ShowLabel === 'undefined' ? true : ShowLabel;
        var row = "", CSV = '', key;
        // 如果要现实表头文字
        if (ShowLabel) {
            // 如果有传入自定义的表头文字
            if (columns.title.length) {
                columns.title.map(function (n) {
                    row += n + ',';
                });
            } else {
                // 如果没有，就直接取数据第一条的对象的属性
                for (key in data[0]) row += key + ',';
            }
            row = row.slice(0, -1); // 删除最后一个,号，即a,b, => a,b
            CSV += row + '\r\n'; // 添加换行符号
        }
        // 具体的数据处理
        data.map(function (n) {
            row = '';
            // 如果存在自定义key值
            if (columns.key.length) {
                columns.key.map(function (m) {
                    row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(m, n[m]) || n[m] : n[m]) + '",';
                });
            } else {
                for (key in n) {
                    row += '"' + (typeof columns.formatter === 'function' ? columns.formatter(key, n[key]) || n[key] : n[key]) + '",';
                }
            }
            row.slice(0, row.length - 1); // 删除最后一个,
            CSV += row + '\r\n'; // 添加换行符号
        });
        if (!CSV) return;
        this.SaveAs(fileName, CSV);
    },
    SaveAs: function (fileName, csvData) {
        var bw = this.browser();
        if (!bw['edge'] || !bw['ie']) {
            var alink = document.createElement("a");
            alink.id = "linkDwnldLink";
            alink.href = this.getDownloadUrl(csvData);
            document.body.appendChild(alink);
            var linkDom = document.getElementById('linkDwnldLink');
            linkDom.setAttribute('download', fileName);
            linkDom.click();
            document.body.removeChild(linkDom);
        }
        else if (bw['ie'] >= 10 || bw['edge'] == 'edge') {
            var _utf = "\uFEFF";
            var _csvData = new Blob([_utf + csvData], {
                type: 'text/csv'
            });
            navigator.msSaveBlob(_csvData, fileName);
        }
        else {
            var oWin = window.top.open("about:blank", "_blank");
            oWin.document.write('sep=,\r\n' + csvData);
            oWin.document.close();
            oWin.document.execCommand('SaveAs', true, fileName);
            oWin.close();
        }
    },
    getDownloadUrl: function (csvData) {
        var _utf = "\uFEFF"; // 为了使Excel以utf-8的编码模式，同时也是解决中文乱码的问题
        if (window.Blob && window.URL && window.URL.createObjectURL) {
            csvData = new Blob([_utf + csvData], {
                type: 'text/csv'
            });
            return URL.createObjectURL(csvData);
        }
        // return 'data:attachment/csv;charset=utf-8,' + _utf + encodeURIComponent(csvData);
    },
    browser: function () {
        var Sys = {};
        var ua = navigator.userAgent.toLowerCase();
        var s;
        (s = ua.indexOf('edge') !== - 1 ? Sys.edge = 'edge' : ua.match(/rv:([\d.]+)\) like gecko/)) ? Sys.ie = s[1] :
            (s = ua.match(/msie ([\d.]+)/)) ? Sys.ie = s[1] :
                (s = ua.match(/firefox\/([\d.]+)/)) ? Sys.firefox = s[1] :
                    (s = ua.match(/chrome\/([\d.]+)/)) ? Sys.chrome = s[1] :
                        (s = ua.match(/opera.([\d.]+)/)) ? Sys.opera = s[1] :
                            (s = ua.match(/version\/([\d.]+).*safari/)) ? Sys.safari = s[1] : 0;
        return Sys;
    }
};

function tempAlert(msg, duration) {
	var el = document.createElement("div");
	el.setAttribute("style", "position:absolute;top:50%;left:50%;background-color:#83BF73;padding:20px");
	el.innerHTML = msg;
	setTimeout(function () {
		el.parentNode.removeChild(el);
	}, duration);
	document.body.appendChild(el);
}