/*
jd宠汪汪偷好友积分与狗粮,及给好友喂食
偷好友积分上限是20个好友(即获得100积分)，帮好友喂食上限是20个好友(即获得200积分)，偷好友狗粮上限也是20个好友(最多获得120g狗粮)
IOS用户支持京东双账号,NodeJs用户支持N个京东账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
更新时间:2020-08-27
如果开启了给好友喂食功能，建议先凌晨0点运行jd_joy.js脚本获取狗粮后，再运行此脚本(jd_joy_steal.js)可偷好友积分，6点运行可偷好友狗粮
注：如果使用Node.js, 需自行安装'crypto-js,got,http-server,tough-cookie'模块. 例: npm install crypto-js http-server tough-cookie got --save
*/
// quantumultx
// [task_local]
// #宠汪汪偷好友积分与狗粮
// 0 0,6 * * * https://raw.githubusercontent.com/lxk0301/scripts/master/jd_joy_steal.js, tag=宠汪汪偷好友积分与狗粮, img-url=https://raw.githubusercontent.com/58xinian/icon/master/jdcww.png, enabled=true
// Loon
// [Script]
// cron "0 0,6 * * *" script-path=https://raw.githubusercontent.com/lxk0301/scripts/master/jd_joy_steal.js,tag=宠汪汪偷好友积分与狗粮
// Surge
// 宠汪汪偷好友积分与狗粮 = type=cron,cronexp="0 0,6 * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/lxk0301/scripts/master/jd_joy_steal.js
const $ = new Env('宠汪汪偷好友积分与狗粮');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
} else {
  cookiesArr.push($.getdata('CookieJD'));
  cookiesArr.push($.getdata('CookieJD2'));
}
let message = '', subTitle = '', UserName = '';

const jdNotify = $.getdata('jdJoyNotify');//是否关闭通知，false打开，true通知
let jdJoyHelpFeed = 'false'//是否给好友喂食，'false'为不给喂食，'true'为给好友喂食，默认不给好友喂食
const weAppUrl = 'https://draw.jdfcloud.com//pet';
const JD_API_HOST = 'https://jdjoy.jd.com/pet'
!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      console.log(`\n开始【京东账号${$.index}】${UserName}\n`);
      message = '';
      subTitle = '';
      await jdJoySteal();
    }
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function jdJoySteal() {
  await getFriends();
  if ($.getFriendsData.success) {
    message += `【京东账号${$.index}】${UserName}\n`;
    await getCoinChanges();
    if ($.getFriendsData.datas && $.getFriendsData.datas.length  > 0) {
      const { lastPage } = $.getFriendsData.page;
      console.log('lastPage', lastPage)
      $.allFriends = [];
      for (let i = 1; i <= new Array(lastPage).fill('').length; i++) {
        console.log(`开始查询第${i}页好友\n`);
        await getFriends(i);
        $.allFriends = $.allFriends.concat($.getFriendsData.datas);
      }
      for (let index = 0; index < $.allFriends.length; index ++) {
        //剔除自己
        if (!$.allFriends[index].stealStatus) {
          $.allFriends.splice(index, 1);
        }
      }
      console.log(`共${$.allFriends.length}个好友`);
      $.helpFood = 0;
      $.stealFriendCoin = 0;
      $.stealFood = 0;
      // for (let friends of $.allFriends) {
      //   const { friendPin, status, stealStatus } = friends;
      //   console.log(`\n好友【${friendPin}】--偷食状态：${stealStatus}`);
      //   console.log(`好友【${friendPin}】--喂食状态：${status}\n`);
      //   // if ($.visit_friend !== 100) {
      //   //   await stealFriendCoin(friendPin);//领好友积分
      //   // } else {
      //   //   $.stealFriendCoin = `已达上限(已获得100积分)`
      //   // }
      //   if (stealStatus === 'can_steal') {
      //     //可偷狗粮
      //     //偷好友狗粮
      //     const enterFriendRoomRes = await enterFriendRoom(friendPin);
      //     if (enterFriendRoomRes.data.stealFood && enterFriendRoomRes.data.stealFood > 0) {
      //       await doubleRandomFood(friendPin);
      //       const getRandomFoodRes = await getRandomFood(friendPin);
      //       if (getRandomFoodRes.success) {
      //         if (getRandomFoodRes.errorCode === 'steal_ok') {
      //           $.stealFood += getRandomFoodRes.data;
      //         }
      //         // else if (getRandomFoodRes.errorCode === 'chance_full') {
      //         //   $.stealFood = '已达上限';
      //         // } else if (getRandomFoodRes.errorCode === 'cannot_steal') {
      //         //   $.stealFood = '失败,好友已无多余狗粮';
      //         // }
      //       }
      //     }
      //   }
      // }
      await Promise.all([
        stealFriendCoinFun(),//偷积分
        stealFriendsFood(),//偷好友狗粮
        helpFriendsFeed()//给好友喂食
      ])
      await showMsg();
    }
  } else {
    if ($.getFriendsData.errorCode === 'B0001') {
      $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${UserName}\n请重新登录获取\nhttps://bean.m.jd.com/`, {"open-url": "https://bean.m.jd.com/"});
      if ($.index === 1) {
        $.setdata('', 'CookieJD');//cookie失效，故清空cookie。
      } else if ($.index === 2){
        $.setdata('', 'CookieJD2');//cookie失效，故清空cookie。
      }
      if ($.isNode()) {
        await notify.sendNotify(`${$.name}cookie已失效`, `京东账号${$.index} ${UserName}\n请重新登录获取cookie`);
      }
      // if ($.isNode()) {
      //   await notify.BarkNotify(`${$.name}cookie已失效`, `京东账号${$.index} ${UserName}\n请重新登录获取cookie`);
      // }
    } else {
      message += `${$.getFriendsData.errorMessage}\n`;
    }
  }
}
async function stealFriendsFood() {
  console.log(`开始偷好友狗粮`);
  for (let friends of $.allFriends) {
    const { friendPin, status, stealStatus } = friends;
    console.log(`stealFriendsFood---好友【${friendPin}】--偷食状态：${stealStatus}\n`);
    // console.log(`stealFriendsFood---好友【${friendPin}】--喂食状态：${status}\n`);
    if (stealStatus === 'can_steal') {
      //可偷狗粮
      //偷好友狗粮
      console.log(`发现好友【${friendPin}】可偷狗粮\n`)
      await enterFriendRoom(friendPin);
      await doubleRandomFood(friendPin);
      const getRandomFoodRes = await getRandomFood(friendPin);
      console.log(`偷好友狗粮结果：${JSON.stringify(getRandomFoodRes)}`)
      if (getRandomFoodRes.success) {
        if (getRandomFoodRes.errorCode === 'steal_ok') {
          $.stealFood += getRandomFoodRes.data;
        }
      }
    } else if (stealStatus === 'chance_full') {
      console.log('偷好友狗粮已达上限，跳出循环');
      break;
    }
  }
}
//偷好友积分
async function stealFriendCoinFun() {
  if ($.visit_friend !== 100) {
    console.log('开始偷好友积分')
    for (let friends of $.allFriends) {
      const { friendPin } = friends;
      await stealFriendCoin(friendPin);//领好友积分
      if ($.stealFriendCoin * 1 === 100) {
        console.log(`偷好友积分已达上限${$.stealFriendCoin}个，现跳出循环`)
        break
      }
    }
  } else {
    console.log('偷好友积分已达上限(已获得100积分)')
    $.stealFriendCoin = `已达上限(已获得100积分)`
  }
}
//给好友喂食
async function helpFriendsFeed() {
  if ($.help_feed !== 200) {
    //可给好友喂食
    jdJoyHelpFeed = $.getdata('jdJoyHelpFeed') ? $.getdata('jdJoyHelpFeed') : jdJoyHelpFeed
    if (jdJoyHelpFeed && jdJoyHelpFeed === 'true') {
      console.log(`开始给好友喂食`);
      for (let friends of $.allFriends) {
        const { friendPin, status, stealStatus } = friends;
        // console.log(`\nhelpFriendsFeed---好友【${friendPin}】--偷食状态：${stealStatus}`);
        console.log(`helpFriendsFeed---好友【${friendPin}】--喂食状态：${status}\n`);
        if (status === 'not_feed') {
          const helpFeedRes = await helpFeed(friendPin);
          if (helpFeedRes.errorCode === 'help_ok' && helpFeedRes.success) {
            $.helpFood += 10;
          } else if (helpFeedRes.errorCode === 'chance_full') {
            console.log('喂食已达上限,不再喂食')
            break
          } else if (helpFeedRes.errorCode === 'food_insufficient') {
            console.log('帮好友喂食失败，您的狗粮不足10g')
            break
          }
        } else if (status === 'time_error') {
          console.log(`好友 ${friendPin} 的汪汪正在食用`)
        }
      }
    } else {
      console.log('您已设置不为好友喂食，现在跳过喂食，如需为好友喂食请在BoxJs打开喂食开关或者更改脚本 jdJoyHelpFeed 处')
    }
  } else {
    console.log('帮好友喂食已达上限(已帮喂20个好友获得200积分)')
    $.helpFood = '已达上限(已帮喂20个好友获得200积分)'
  }
}
function getFriends(currentPage = '1') {
  return new Promise(resolve => {
    const options = {
      url: `${JD_API_HOST}/getFriends?itemsPerPage=20&currentPage=${currentPage}`,
      headers: {
        'Cookie': cookie,
        'reqSource': 'h5',
        'Host': 'jdjoy.jd.com',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Referer': 'https://jdjoy.jd.com/pet/index',
        'User-Agent': 'jdapp;iPhone;8.5.8;13.4.1;9b812b59e055cd226fd60ebb5fd0981c4d0d235d;network/wifi;supportApplePay/3;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone9,2;addressid/138109592;hasOCPay/0;appBuild/167169;supportBestPay/0;jdSupportDarkMode/0;pv/200.75;apprpd/MyJD_Main;ref/MyJdMTAManager;psq/29;ads/;psn/9b812b59e055cd226fd60ebb5fd0981c4d0d235d|608;jdv/0|direct|-|none|-|1587263154256|1587263330;adk/;app_device/IOS;pap/JA2015_311210|8.5.8|IOS 13.4.1;Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
        'Accept-Language': 'zh-cn',
        'Accept-Encoding': 'gzip, deflate, br',
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          // console.log('JSON.parse(data)', JSON.parse(data))
          $.getFriendsData = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}

async function stealFriendCoin(friendPin) {
  // console.log(`进入好友 ${friendPin}的房间`)
  const enterFriendRoomRes = await enterFriendRoom(friendPin);
  const { friendHomeCoin } = enterFriendRoomRes.data;
  if (friendHomeCoin > 0) {
    //领取好友积分
    console.log(`好友 ${friendPin}的房间可领取积分${friendHomeCoin}个\n`)
    const getFriendCoinRes = await getFriendCoin(friendPin);
    console.log(`偷好友积分结果：${JSON.stringify(getFriendCoinRes)}\n`)
    if (getFriendCoinRes.errorCode === 'coin_took_ok') {
      $.stealFriendCoin += getFriendCoinRes.data;
    }
  } else {
    console.log(`好友 ${friendPin}的房间暂无可领取积分\n`)
  }
}
//进入好友房间
function enterFriendRoom(friendPin) {
  console.log(`\nfriendPin:: ${friendPin}\n`);
  return new Promise(async resolve => {
    await $.wait(900);
    $.get(taskUrl('enterFriendRoom', (friendPin)), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          console.log(`\n${JSON.stringify(err)}`)
          console.log(`\n${err}\n`)
          throw new Error(err);
        } else {
          // console.log('进入好友房间', JSON.parse(data))
          data = JSON.parse(data);
          console.log(`可偷狗粮：${data.data.stealFood}`)
          console.log(`可偷积分：${data.data.friendHomeCoin}`)
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//收集好友金币
function getFriendCoin(friendPin) {
  return new Promise(resolve => {
    $.get(taskUrl('getFriendCoin', friendPin), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          // console.log(`收集好友金币结果--${data}`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//帮好友喂食
function helpFeed(friendPin) {
  return new Promise(resolve => {
    $.get(taskUrl('helpFeed', friendPin), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          console.log(`帮忙喂食结果--${data}`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
//收集好友狗粮,已实现分享可得双倍狗粮功能
//①分享
function doubleRandomFood(friendPin) {
  return new Promise(resolve => {
    $.get(taskUrl('doubleRandomFood', friendPin), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          // console.log('分享', JSON.parse(data))
          // $.appGetPetTaskConfigRes = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
//②领取双倍狗粮
function getRandomFood(friendPin) {
  return new Promise(resolve => {
    $.get(taskUrl('getRandomFood', friendPin), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          console.log(`领取双倍狗粮结果--${data}`)
          data = JSON.parse(data);
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    })
  })
}
function getCoinChanges() {
  return new Promise(resolve => {
    const options = {
      url: `${JD_API_HOST}/getCoinChanges?changeDate=${Date.now()}`,
      headers: {
        'Cookie': cookie,
        'reqSource': 'h5',
        'Host': 'jdjoy.jd.com',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Referer': 'https://jdjoy.jd.com/pet/index',
        'User-Agent': 'jdapp;iPhone;8.5.8;13.4.1;9b812b59e055cd226fd60ebb5fd0981c4d0d235d;network/wifi;supportApplePay/3;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone9,2;addressid/138109592;hasOCPay/0;appBuild/167169;supportBestPay/0;jdSupportDarkMode/0;pv/200.75;apprpd/MyJD_Main;ref/MyJdMTAManager;psq/29;ads/;psn/9b812b59e055cd226fd60ebb5fd0981c4d0d235d|608;jdv/0|direct|-|none|-|1587263154256|1587263330;adk/;app_device/IOS;pap/JA2015_311210|8.5.8|IOS 13.4.1;Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
        'Accept-Language': 'zh-cn',
        'Accept-Encoding': 'gzip, deflate, br',
      }
    }
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n京东宠汪汪: API查询请求失败 ‼️‼️')
          throw new Error(err);
        } else {
          // console.log('getCoinChanges', JSON.parse(data))
          data = JSON.parse(data);
          if (data.datas && data.datas.length > 0) {
            $.help_feed = 0;
            $.visit_friend = 0;
            for (let item of data.datas) {
              if ($.time('yyyy-MM-dd') === timeFormat(item.createdDate) && item.changeEvent === 'help_feed'){
                $.help_feed = item.changeCoin;
              }
              if ($.time('yyyy-MM-dd') === timeFormat(item.createdDate) && item.changeEvent === 'visit_friend') {
                $.visit_friend = item.changeCoin;
              }
            }
            console.log(`$.help_feed给好友喂食获得积分：${$.help_feed}`);
            console.log(`$.visit_friend领取好友积分：${$.visit_friend}`);
          }
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve();
      }
    })
  })
}
function showMsg() {
  $.stealFood = $.stealFood >= 0 ? `【偷好友狗粮】获取${$.stealFood}g狗粮\n` : `【偷好友狗粮】${$.stealFood}\n`;
  $.stealFriendCoin = $.stealFriendCoin >= 0 ? `【领取好友积分】获得${$.stealFriendCoin}个\n` : `【领取好友积分】${$.stealFriendCoin}\n`;
  $.helpFood = $.helpFood >= 0 ? `【给好友喂食】消耗${$.helpFood}g狗粮,获得积分${$.helpFood}个\n` : `【给好友喂食】${$.helpFood}\n`;
  message += $.stealFriendCoin;
  message += $.stealFood;
  message += $.helpFood;

  $.log(`\n${message}\n`);
  if (!jdNotify || jdNotify === 'false') {
    $.msg($.name, '', message);
  }
}

function taskUrl(functionId, friendPin) {
  return {
    url: `${JD_API_HOST}/${functionId}?friendPin=${encodeURI(friendPin)}`,
    headers: {
      'Cookie': cookie,
      'reqSource': 'h5',
      'Host': 'jdjoy.jd.com',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Referer': 'https://jdjoy.jd.com/pet/index',
      'User-Agent': 'jdapp;iPhone;8.5.8;13.4.1;9b812b59e055cd226fd60ebb5fd0981c4d0d235d;network/wifi;supportApplePay/3;hasUPPay/0;pushNoticeIsOpen/0;model/iPhone9,2;addressid/138109592;hasOCPay/0;appBuild/167169;supportBestPay/0;jdSupportDarkMode/0;pv/200.75;apprpd/MyJD_Main;ref/MyJdMTAManager;psq/29;ads/;psn/9b812b59e055cd226fd60ebb5fd0981c4d0d235d|608;jdv/0|direct|-|none|-|1587263154256|1587263330;adk/;app_device/IOS;pap/JA2015_311210|8.5.8|IOS 13.4.1;Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1',
      'Accept-Language': 'zh-cn',
      'Accept-Encoding': 'gzip, deflate, br',
    }
  }
}
function timeFormat(time) {
  let date;
  if (time) {
    date = new Date(time)
  } else {
    date = new Date();
  }
  return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,o)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,h]=i.split("@"),a={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"}};this.post(a,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),h=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)}):this.isQuanX()?$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t)):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t)))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t))}}time(t){let e={"M+":(new Date).getMonth()+1,"d+":(new Date).getDate(),"H+":(new Date).getHours(),"m+":(new Date).getMinutes(),"s+":(new Date).getSeconds(),"q+":Math.floor(((new Date).getMonth()+3)/3),S:(new Date).getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,((new Date).getFullYear()+"").substr(4-RegExp.$1.length)));for(let s in e)new RegExp("("+s+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?e[s]:("00"+e[s]).substr((""+e[s]).length)));return t}msg(e=t,s="",i="",o){const r=t=>{if(!t||!this.isLoon()&&this.isSurge())return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}}};this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,r(o)):this.isQuanX()&&$notify(e,s,i,r(o)));let h=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];h.push(e),s&&h.push(s),i&&h.push(i),console.log(h.join("\n")),this.logs=this.logs.concat(h)}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}