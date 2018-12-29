import tornado.web


class IndexHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("g2018/index.html")


handlers = [
    (r"/g2018", IndexHandler)
]
