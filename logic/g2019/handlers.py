import json
import os.path
from glob import glob

import tornado.web


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("g2019/index.html")


class AssetsListHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(json.dumps({
            "image": self._get_assets_of("img"),
            "sound": self._get_assets_of("mp3"),
        }))

    def _get_assets_of(self, asset_type):
        pattern = os.path.join(
            self.application.settings["static_path"],
            "g2019",
            "assets",
            asset_type,
            "*")
        assets = list(map(os.path.basename, glob(pattern)))
        base_urls = [
            f"g2019/assets/{asset_type}/{asset}"
            for asset in assets]
        urls = map(self.static_url, base_urls)
        return {
            asset: url
            for asset, url in zip(assets, urls)
        }


handlers = [
    (r"/g2019", IndexHandler),
    (r"/g2019/assets", AssetsListHandler),
]
