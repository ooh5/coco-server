const Service = require('egg').Service;
const { Octokit } = require("@octokit/core");
const download = require('download-git-repo');
const utils = require('../utils/fileUtils');
const fs = require('fs');
const shell = require('shelljs');
const process = require('child_process');
const octokit = new Octokit({ auth: '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' });

function downloadFunc(downloadRepoUrl, temp_dest) {
  return new Promise(async (resolve, reject) => {
    console.log(downloadRepoUrl);
    download('ooh5/coco-template', temp_dest,  (err) => {
      if (err) {
        console.log(err);
        reject('请求模板下载失败');
      } else {
        resolve('请求模板下载成功');
      }
    })
  });
}

async function release(repoUrl, repoName) {
  try {
    process.execSync(
      `cd static/${repoName}/dist &&
       git init &&
        git remote add origin ${repoUrl} &&
       git add -A &&
       git commit -m 'deploy' &&
       git push -f ${repoUrl} master:gh-pages &&
       cd -`
    )
    // shell.exec(
    //   `cd static/${repoName}/dist &&
    //    git init &&
    //     git remote add origin ${repoUrl} &&
    //    git add -A &&
    //    git commit -m 'deploy' &&
    //    git push -f ${repoUrl} master:gh-pages &&
    //    cd -`
    // )

    // process.execSync(
    //   `cd static/${repoName}/dist;
    //    git init;
    //     git remote add origin ${repoUrl};
    //    git add -A;
    //    git commit -m 'deploy';
    //    git push -f ${repoUrl} master:gh-pages;
    //    cd -`
    // )
  }  catch (e) {
    console.log('--------------------------------------------------')
    console.log(e);
    console.log('--------------------------------------------------')
  } finally {
    process.exec(`cd static && rm -rf ${repoName}`);
  }
}

async function renderTpl({templateGit, name: repoName, data, repoUrl, templateConfig}) {
  if (!(await utils.existOrNot('./static'))) {
    await utils.mkdirFolder('static');
  }

  // 基础模版所在目录，如果是初始化，则是模板名称，否则是项目名称
  const temp_dest = `static/${templateConfig.templateName || repoName}`;

  // 下载模板
  if (!(await utils.existOrNot(temp_dest))) {
    await downloadFunc(templateConfig.git || repoUrl, temp_dest);
  }

  // 注入数据
  const res = fs.readFileSync(`${temp_dest}/dist/index.html`, 'utf-8');
  let target = res.replace(
    /(?<=<script data-inject>).*?(?=<\/script>)/,
    `window.__coco_config__= ${JSON.stringify({
      ...data,
      components: data.userSelectComponents
    })}`
  );

  target = target.replace(/(?<=<title>).*?(?=<\/title>)/, data.config.projectName);

  fs.writeFileSync(`${temp_dest}/dist/index.html`, target);

  await release(repoUrl, templateConfig.templateName || repoName);

  return Promise.resolve({});
}

class ProjectService extends Service {
  async createProject(config) {
    // todo 判断是否已经存在项目，存在则不创建
    const {data: {id, ssh_url}} = await octokit.request('POST /orgs/ooh5/repos', {
      org: 'ooh5',
      name: config.name
    });

    await renderTpl({
      ...config,
      repoUrl: ssh_url
    });
    return {id, ssh_url}
  }

}

module.exports = ProjectService;
