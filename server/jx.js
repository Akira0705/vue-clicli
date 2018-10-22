const axios = require('axios')
const Base64 = require('js-base64').Base64
const fs = require('fs')


function urlType(url) {
  if (url.indexOf('hcy') > -1) return 'hcy'
  if (url.indexOf('typt') > -1) return 'typt'
  if (url.indexOf('bit') > -1) return 'bit'
  if (url.indexOf('qq') > -1) return 'qq'
  if (url.indexOf('qinmei') > -1) return 'qinmei'
  if (url.indexOf('bilibili') > -1) return 'bilibili'
  if (url.indexOf('wocloud') > -1) return 'wo'
}


exports.default = async ctx => {
  let url = decodeURIComponent(ctx.query.url)
  let type = urlType(url)
  switch (type) {
    case 'bilibili':
      let ob
      if (url.indexOf('av') < 0) {
        url = url.replace('www.', 'm.')

        ob = await axios.get(url).then(res => {
          let cid, aid

          cid = res.data.match(/cid(\S*)cover/)
          aid = res.data.match(/aid(\S*)cid/)

          if (cid) {
            return {
              a: aid[1].substring(2, aid[1].length - 2),
              c: cid[1].substring(2, cid[1].length - 2)
            }
          }
        })
      } else {
        url = url + '/'
        let aid = url.match(/av(\S+?)\//)[1].replace('/', '')
        ob = await axios.get('https://api.bilibili.com/x/web-interface/view', {
          params: {
            aid
          }
        }).then(res => {
          let p2 = res.data.data.pages
          if (p2.length > 1) {
            p2 = res.data.data.pages[1].cid
          }
          return {
            a: aid,
            c: res.data.data.cid,
            p2
          }
        })
      }
      let ep, av
      if (url.indexOf('av') < 0) {
        ep = await axios.get(`https://www.kanbilibili.com/api/video/${ob.a}/download`, {
          params: {
            cid: ob.c,
            quality: 16,
            page: 1,
            bangumi: 1
          },
          headers: {
            Host: 'www.kanbilibili.com'
          }
        }).then(res => {
          return res.data.data.durl[0].url.replace('http', 'https')
        })
      } else {
        if (url.indexOf('p=') < 0) {
          av = await axios.get('https://api.bilibili.com/x/player/playurl', {
            params: {
              cid: ob.c,
              avid: ob.a,
              platform: 'html5',
              otype: 'json',
              qn: 16,
              type: 'mp4'
            },
            headers: {
              Host: 'api.bilibili.com',
            }
          }).then(res => {
            return res.data.data.durl[0].url.replace('http', 'https')
          })
        } else {
          let p = url.match(/p=(\S*)/)[1]
          av = await axios.get(`https://www.kanbilibili.com/api/video/${ob.a}/download`, {
            params: {
              cid: ob.p2 ? ob.p2 : ob.c,
              quality: 16,
              page: p ? p : 1
            },
            headers: {
              Host: 'www.kanbilibili.com'
            }
          }).then(res => {
            return res.data.data.durl[0].url
          })
        }

      }

      ctx.body = {
        code: 0,
        aid: ob.a,
        cid: ob.c,
        url: url.indexOf('av') < 0 ? ep : av,
        type: 'mp4'
      }
      break
    case 'qq':
      url = url.substring(url.length - 16, url.length - 5)
      const qqv = await axios.get(`http://vv.video.qq.com/getinfo`, {
        headers: {
          'X-Forwarded-For': '183.3.226.35'
        },
        params: {
          vids: url,
          platform: 101001,
          charge: 0,
          otype: 'json'
        }
      }).then(res => {
        let data = res.data.substring(13, res.data.length - 1)
        data = JSON.parse(data)
        return {
          pre: data.vl.vi[0].ul,
          vid: data.vl.vi[0].vid
        }

      })

      await axios.get('http://vv.video.qq.com/getkey', {
        headers: {
          'X-Forwarded-For': '183.3.226.35'
        },
        params: {
          format: 2,
          otype: 'json',
          vt: 150,
          vid: qqv.vid,
          filename: qqv.vid + '.mp4',
          change: 0,
          platform: '11'
        }
      }).then(res => {
        let data = res.data.substring(13, res.data.length - 1)
        data = JSON.parse(data)
        let fn = data.filename
        let key = data.key

        ctx.body = {
          code: 0,
          url: `http://221.7.255.177/cache.p4p.com/${fn}?vkey=${key}`,
          type: 'mp4'
        }
      })
      break
    case 'qinmei':
      let link = Base64.decode(url.match(/l=(\S*)/)[1])
      let pa = link.split(';')
      const out = await axios.post(`https://qinmei.org/wp-json/wp/v2/animeinfo/play?animateweb=19414`, {
        animate: pa[0],
        sort: pa[2]
      }, {
        headers: {
          'referer': url,
          'origin': 'https://qinmei.video'
        }
      }).then(res => {
        return res.data.link
      })
      ctx.body = {
        code: 0,
        url: out,
        type: 'mp4'
      }
      break
    case 'hcy':
      await axios.get(url).then(res => {
        let out = res.data.match(/download(\S*);/)
        let u = out[0].substring(0, out[0].length - 2)

        ctx.body = {
          code: 0,
          url: `http://${u}`,
          type: 'mp4'
        }
      })
      break
    case 'bit':
      await axios.get(url, {
        headers: {
          'Host': '193.112.131.234:8081',
          'Referer': 'http://193.112.131.234:8081/dir/bit?id=b4b3dada475f49589530096c2ec66a90',
          'Cookie': 'ci_session=b4fac7eb08062cf0d923752e3af8c0b39ea80f23',
          'Upgrade-Insecure-Requests': 1,
          'Pragma': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': ' zh-CN,zh;q=0.9',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      }).then(res => {
        let src
        if (url.indexOf('vbit') > -1) {
          src = res.data
        } else {
          src = res.data.match(/url = "https:([\s\S]+?)"/)[0].replace('"', '')
        }

        ctx.body = {
          code: 0,
          url: src,
          type: 'mp4'
        }
      })
      break
    case 'typt':
      await axios.get(url).then(res => {
        let src = res.data.match(/url = "https:([\s\S]+?);/)[1]
        ctx.body = {
          code: 0,
          url: `https:${src}`,
          type: 'mp4'
        }
      })
      break
    case 'wo':
      await axios.post('https://pan.bitqiu.com/download/getUrl', {
        fileIds: '11b135045a6140d69d26c8d1af828ce2'
      }, {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Content-Length': 40,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Cookie': 'UM_distinctid=166967394ce7a6-0da5e35c917d8f-551f3c12-384000-166967394cf45; cloud_web_in=223bebfae89c4720ae842aa17f6b29d3; Hm_lvt_8d02905a9d991c46155306095c479b2d=1540106919,1540109950,1540122444,1540133214; cloud_web_sid=2a7e6cb895d14a3ca88a83503d40c933; cloud_web_uid=104778599; Hm_lpvt_8d02905a9d991c46155306095c479b2d=1540133676; CNZZDATA1273903500=318535250-1540118697-https%253A%252F%252Fpan.bitqiu.com%252F%7C1540129532',
          'Host': 'pan.bitqiu.com',
          'Origin': 'https://pan.bitqiu.com',
          'Referer': 'https://pan.bitqiu.com/index',
          'X-Requested-With': 'XMLHttpRequest',
          'Upgrade-Insecure-Requests': 1,
          'Pragma': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.81 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': ' zh-CN,zh;q=0.9',
          'Connection': 'keep-alive',
        }
      }).then(res => {
        console.log(res.data)
      })
      break
    default:
      ctx.body = {
        code: 0,
        url,
        type: url.indexOf('m3u8') < 0 ? 'mp4' : 'hls'
      }
  }
}
