/*************************************

TestFlight自动加入脚本
项目地址：https://github.com/778YYDS/WeChat_script
脚本作者：778

**************************************/

const $ = new API("TestFlight自动加入");

!(async () => {
  if ($.isRequest) return getParams();

  const tf_ids = $.getdata("tf_app_ids") || "";
  const LOON_COUNT = parseInt($.getdata("tf_join_count")) || 1;
  const INTERVAL = parseInt($.getdata("tf_join_interval")) || 0;

  if (!tf_ids) return $.log("未获取到 tf_app_ids 参数");
  if (!LOON_COUNT) return $.log("未设置 tf_join_count 参数");

  const APP_IDS = tf_ids.split(",");

  const noJoinExists = APP_IDS.some((app_id) => app_id.split("#")[1] === "0");
  if (!noJoinExists) return $.log("没有需要加入的APP_ID");

  for (let app_id of APP_IDS) {
    const [appId, status] = app_id.split("#");
    if (status === "0") {
      for (let i = 0; i < LOON_COUNT; i++) {
        INTERVAL && (await $.wait(INTERVAL * 1000));
        try {
          const appData = await TF_Check(appId);
          if (!appData?.data) {
            $.log(`${appId} 无法接受邀请, 继续执行`);
            continue;
          }

          if (appData.data.status === "OPEN") {
            $.log(`${appId}(${appData.data.app.name})`, `开放加入，正在加入...`);
            const jsonBody = await TF_Join(appId);
            $.log(`🎉加入成功`);
            $.msg(`${jsonBody.data.name}`, "TestFlight加入成功");
            APP_IDS[APP_IDS.indexOf(app_id)] = `${app_id.replace("#0", "#1")}`;
            $.setdata(APP_IDS.join(","), "tf_app_ids");
            break;
          } else if (appData.data.status === "INVALID") {
            $.log(`${appId}(${appData.data.app.name})`, `状态：INVALID（无效或不存在）`);
            // 已去除自动删除无效 ID 的逻辑
          } else {
            $.log(`${appId}(${appData.data.app.name})`, `${appData.data.message}`);
          }
        } catch (err) {
          $.log(err);
          break;
        }
      }
      $.log("================================");
      $.log(appId + " 执行完成");
      $.log("================================");
    } else {
      $.log(`${appId} 已加入, 跳过`);
      $.log("================================");
    }
  }
})()
  .catch((e) => $.log("", `❗️${$.name}, 错误!`, e))
  .finally(() => $.done({}));

function getParams() {
  if ($.read("tf_app_ids")) {
    $.msg("TestFlight自动加入", "配置已存在", "如需更新，请手动清除参数。");
    return $.done();
  }

  const tfAppId = $.request.url.match(/testflight\.apple\.com\/join\/([\w-]+)/)?.[1];
  if (!tfAppId) return $.done();

  const old_ids = $.getdata("tf_app_ids") || "";
  const exists = old_ids.includes(tfAppId);

  if (exists) {
    $.msg("TestFlight自动加入", "应用ID: " + tfAppId, "已存在，无需重复添加。");
    return $.done();
  }

  const app_ids = old_ids ? old_ids + "," + tfAppId + "#0" : tfAppId + "#0";
  $.setdata(app_ids, "tf_app_ids");

  $.msg("TestFlight自动加入", "添加成功", tfAppId);
  $.done();
}

async function TF_Check(appId) {
  const url = `https://testflight.apple.com/join/${appId}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  return await $.http
    .get({ url, headers })
    .then((resp) => {
      const matched = resp.body.match(/window\._app\=(.*);<\/script>/);
      if (!matched) return {};
      return JSON.parse(matched[1]);
    })
    .catch((err) => {
      $.log("检查失败", err);
      return {};
    });
}

async function TF_Join(appId) {
  const url = `https://testflight.apple.com/v3/accounts/${genUuid()}/ru/${appId}`;
  const headers = {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  return await $.http
    .post({ url, headers })
    .then((resp) => JSON.parse(resp.body))
    .catch((err) => {
      $.log("加入失败", err);
      return {};
    });
}

function genUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function inArray(val) {
  for (let i = 0; i < APP_IDS.length; i++) {
    if (APP_IDS[i] === val) return i;
  }
  return -1;
}