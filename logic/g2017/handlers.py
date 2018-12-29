import tornado.web


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("g2017/index.html")


handlers = [
    (r"/g2017", IndexHandler)
]
