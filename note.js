// ==UserScript==
// @name          douban_note_Lib
// @namespace     https://www.douban.com/people/57965364/douban_note
// @description   douban_note library
// @include       *
// @match         *
// @version       0.0.1
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// ==/UserScript==
var save_As;
var html_Docx;
function downloadNotes(uid, saveas, htmldocx) {
	save_As = saveas;
	html_Docx = htmldocx;
	notesUrl = "https://www.douban.com/people/" + uid + "/notes";
	parseNotesPage(notesUrl);
}

function parseNotesPage(url) {
	fetch(url).then(res => res.text())
		.then(text => new DOMParser().parseFromString(text, 'text/html'))
		.then(function (data) {
			var nextUrl;
			if (data.getElementsByClassName("next").length != 0 &&
				data.getElementsByClassName("next")[0].getElementsByTagName("a")[0] != null) {
				nextUrl = data.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
			}
			var notesLinks = data.getElementsByClassName("j a_unfolder_n");
			var complete = 0;
			[].forEach.call(notesLinks, function (notesLink, index) {
				setTimeout(function () {
					downloadNoteAsDoc(notesLink.getAttribute("href"), function () {
						complete++;
						if (complete == notesLinks.length) {
							if (nextUrl != null) {
								console.log("开始日记备份下一页: " + nextUrl);
								parseNotesPage(nextUrl);
							} else {
								alert("全部备份完成");
							}
						}
					});
				}, 1000 * index);
			})
		}, function (error) {
			console.log(error.message);
		})
}


function downloadNoteAsDoc(url, callback) {
	fetch(url).then(res => res.text())
		.then(text => new DOMParser().parseFromString(text, 'text/html'))
		.then(function (document) {
			var note_id = document.getElementsByClassName('note-container')[0].id;
			var date = document.getElementsByClassName("pub-date")[0].innerText.split(/(\s+)/)[0] + " ";
			var title = date + document.getElementsByTagName("h1")[0].innerHTML;
			var contentDocument = document.getElementById(note_id);
			var regularImages = contentDocument.querySelectorAll("img");
			var numOfImage = regularImages.length;
			if (numOfImage == 0) {
				var contentDocument = document.getElementById(note_id);
				var converted = html_Docx.asBlob("\uFEFF" + contentDocument.innerHTML);
				save_As(converted, title + ".docx");
				if (callback && typeof (callback) === "function")
					callback();
			} else {
				var flag = 0;
				[].forEach.call(regularImages, function (imgElement) {
					const w = imgElement.width;
					const h = imgElement.height;
					imgElement.width = w;
					imgElement.height = h;
					if (imgElement.src.endsWith('.webp')) {
						imgElement.src = imgElement.src.replace('.webp', '.jpg');
					}
					getDataUrlBySrc(imgElement.src).then(function (b64) {
						imgElement.src = b64;
						flag++;
						if (flag === numOfImage) {
							var contentDocument = document.getElementById(note_id);
							var converted = html_Docx.asBlob("\uFEFF" + contentDocument.innerHTML);
							save_As(converted, title + ".docx");
							if (callback && typeof (callback) === "function")
								callback();
						}
					});
				})
			};
		}, function (error) {
			console.log(error.message);
		});
}

function getDataUrlBySrc(src) {
	return new Promise(function (resolve, reject) {
		GM_xmlhttpRequest({
			method: "GET",
			url: src,
			responseType: 'arraybuffer',
			onload: function (res) {
				const arr = new Uint8Array(res.response);
				const raw = Array.prototype.map
				.call(arr, charCode => String.fromCharCode(charCode))
				.join("");
				const b64 = btoa(raw);
				const dataURL = "data:image/jpeg;base64," + b64;
				resolve(dataURL);
			},
			onerror:function(err){
				reject(err);
			}
		});
	});
}

// function addComments() {
// 	var commentsHtml = '<div>';
// 	comments = document.getElementsByClassName("content report-comment");
// 	[].forEach.call(comments, function (comment) {
// 		commentHtml = '<div class="content report-comment"><div class="author" style="background:#f2fbf2; color:#666;padding:2px 4px"><span class="">' +
// 			comment.getElementsByClassName("author")[0].innerHTML + "</div>";
// 		if (comment.getElementsByClassName("reply-quote").length != 0) {
// 			commentHtml = commentHtml + '<div class="reply-quote" style="border-left: 1px solid black; padding-left: 4px"><span class="short">' +
// 				comment.getElementsByClassName("reply-quote")[0].getElementsByClassName("short")[0].innerHTML + "</span>" +
// 				comment.getElementsByClassName("reply-quote")[0].getElementsByClassName("pubdate")[0].outerHTML + "</div>";
// 		}
// 		commentHtml = commentHtml + comment.getElementsByTagName("p")[0].outerHTML + "</div>";
// 		commentsHtml = commentsHtml + commentHtml;
// 	});
// 	commentsHtml = commentsHtml + '</div>';
// 	console.log(commentsHtml);

// 	if (document.getElementsByClassName("next").length != 0) {
// 		url = document.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
// 		new Promise(function (resolve, reject) {
// 			var xhr = new XMLHttpRequest();
// 			xhr.open("GET", url, true);
// 			xhr.responseType = "document";
// 			xhr.onload = function () {
// 				resolve(xhr.response);
// 			};
// 			xhr.onerror = function (err) {
// 				reject(err);
// 			};
// 			xhr.send();
// 		}).then(function (data) {
// 			addNextPageComments(data);
// 		}, function (error) {
// 			console.log('Promise rejected');
// 			console.log(error.message);
// 		})
// 	}
// }

// function addNextPageComments(pageDocument) {
// 	var commentsHtml = '<div>';
// 	comments = pageDocument.getElementsByClassName("content report-comment");
// 	[].forEach.call(comments, function (comment) {
// 		commentHtml = '<div class="content report-comment"><div class="author" style="background:#f2fbf2; color:#666;padding:2px 4px"><span class="">' +
// 			comment.getElementsByClassName("author")[0].innerHTML + "</div>";
// 		if (comment.getElementsByClassName("reply-quote").length != 0) {
// 			commentHtml = commentHtml + '<div class="reply-quote" style="border-left: 1px solid black; padding-left: 4px"><span class="short">' +
// 				comment.getElementsByClassName("reply-quote")[0].getElementsByClassName("short")[0].innerHTML + "</span>" +
// 				comment.getElementsByClassName("reply-quote")[0].getElementsByClassName("pubdate")[0].outerHTML + "</div>";
// 		}
// 		commentHtml = commentHtml + comment.getElementsByTagName("p")[0].outerHTML + "</div>";
// 		commentsHtml = commentsHtml + commentHtml;
// 	});
// 	commentsHtml = commentsHtml + '</div>';
// 	console.log(commentsHtml);
// 	if (pageDocument.getElementsByClassName("next").length != 0) {
// 		if (pageDocument.getElementsByClassName("next")[0].getElementsByTagName("a").length != 0) {
// 			url = pageDocument.getElementsByClassName("next")[0].getElementsByTagName("a")[0].href;
// 			new Promise(function (resolve, reject) {
// 				var xhr = new XMLHttpRequest();
// 				xhr.open("GET", url, true);
// 				xhr.responseType = "document";
// 				xhr.onload = function () {
// 					resolve(xhr.response);
// 				};
// 				xhr.onerror = function (err) {
// 					reject(err);
// 				};
// 				xhr.send();
// 			}).then(function (data) {
// 				addNextPageComments(data);
// 			}, function (error) {
// 				console.log('Promise rejected');
// 				console.log(error.message);
// 			});
// 		}
// 	}
// }