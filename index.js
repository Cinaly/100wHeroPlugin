require('shelljs/global');
const AipOcrClient   = require("baidu-aip-sdk").ocr;
const request        = require('request');
const cheerio        = require('cheerio');
const fs             = require('fs');
const images         = require("images");
const pngquant       = require('node-pngquant-native');
const socket         = require('socket.io-client').connect('http://localhost:3538');
const startTime      = new Date().getTime();

class Main{
	
	constructor (){
		this.OCR = {
			APP_ID     : 10672764,
			API_KEY    : '2e4o0q4XCgPZFWPAkxBc2dQi',
			SECRET_KEY : 'Siz8xYL2MP52IPTd8DPVaNAX7C7TVg8k',
		}
		this.socket      = socket;
		this.timestamp   = new Date().getTime();
		this.baiduClient = new AipOcrClient(this.OCR.APP_ID, this.OCR.API_KEY, this.OCR.SECRET_KEY);
	}
	
	_getSearchContent(obj){
		return new Promise((resolve, reject) => {
			request('http://www.baidu.com/s?wd=' + encodeURI(obj.question), (error, response, body) => {
				if (!error && response.statusCode === 200) {
					let str      = '';
					const $      = cheerio.load(body);
					const newArr = [];
					
					for (let item in $('.result.c-container')) {
						if (parseInt(item) !== NaN && parseInt(item) < 20) {
							str += $($('.result.c-container')[item]).text();
						}
					}
					
					for (let item in obj.answer) {
						const value = obj.answer[item].words;
						const arr   = str.split(value);
						newArr.push({
							item  : value,
							count : arr.length - 1
						});
					}
					
					const lastObj = {
						obj: obj,
						newOBj: {
							title : obj.question,
							data  : newArr
						}
					}
					
					resolve(lastObj);
					
				}
			});
			
		});
		
	}
	
	_androidScreenshot(){
		return new Promise((resolve, reject) => {
			const deviceScreencapPath = '/system/bin/screencap';
			const deviceSavePath      = `/sdcard/${this.timestamp}.png`;
			const pcSavePath          = `D:\\jietu\\images\\${this.timestamp}.png`;
			const shell               = `adb shell ${deviceScreencapPath} -p ${deviceSavePath} && adb pull ${deviceSavePath} ${pcSavePath}`
			exec(shell, (code, stdout, stderr) => {
				resolve();
			});
		});
	}
	
	_imageToBase64(){
		return new Promise((resolve, reject) => {
			const imageBuffer  = new Buffer(fs.readFileSync(`images/${this.timestamp}.png`));
			let newImageBuffer = imageBuffer.length > 102400 ? images(imageBuffer).draw(images('mask.png'), 0, 0).resize(720, null).encode('png') : imageBuffer;
			
			newImageBuffer = (pngquant.compress(newImageBuffer, {
				"speed": 10,
				quality: [40, 60]
			}));
			
			fs.writeFile(`images\\build\\${this.timestamp}.png`, newImageBuffer);
			const newImageBase64 = newImageBuffer.toString("base64");
			
			console.log('imageBuffer：'+imageBuffer.length, '---newImageBase64：'+newImageBase64.length);
			resolve(newImageBase64);
		});
	}
	
	_baiduImageToText(newImageBase64){
		
		return new Promise((resolve, reject) => {
			
			this.baiduClient.generalBasic(newImageBase64).then((result) => {
				
				const imageTextObj = result.words_result;
				
				let newKey         = '';
				let answer         = [];
				let question       = [];
				
				// 从源数据格式化出问题与答案
				for (let item in imageTextObj) {
					const index = parseInt(item);
					if (imageTextObj[index].words === '7777') {
						question = imageTextObj.slice(0, index);
						answer   = imageTextObj.slice(imageTextObj.length - index-1, imageTextObj.length);
					}
				}
				
				// 生成标题
				for (let item in question) {
					newKey += question[item].words;
				}
				
				const obj = {
					question : newKey,
					answer   : answer
				}
				
				
				console.log(obj);
				
				resolve(obj);
				
			}).catch(function (err) {
				// 如果发生网络错误
				console.log(err);
			});
			
		});
		
	}
	
	_sendServiceMessage(lastObj) {
		
		const countTime = (new Date().getTime() / 100) - (startTime / 100);
		
		console.log(countTime);
		
		this.socket.emit('sendKeyToServerQuestion', lastObj.obj);
		this.socket.emit('sendKeyToServerAnswer', lastObj.newOBj);
	}
	
	init(){
		
		this._androidScreenshot()
		.then(() => {
			return this._imageToBase64();
		})
		.then((newImageBase64) => {
			return this._baiduImageToText(newImageBase64);
		})
		.then((obj) => {
			return this._getSearchContent(obj);
		})
		.then((lastObj)=>{
			this._sendServiceMessage(lastObj);
		});
	}
	
}

const main = new Main();
main.init();
