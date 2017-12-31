import os
import os.path
import sys
import threading
import tornado.escape
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web


from tornado.options import define
define("port", default=5000, help="run on the given port", type=int)


class Application(tornado.web.Application):
    def __init__(self, handlers):
        settings = dict(
            template_path=os.path.join(os.getcwd(), "resource"),
            static_path=os.path.join(os.getcwd(), "resource"),
            default_handler_class=Default,
        )
        tornado.web.Application.__init__(self, handlers, **settings)


class Default(tornado.web.RequestHandler):
    def get(self):
        self.write("404 ぽわ～ <a href=\"/\">もどる</a>")


class TopPage(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html")


def run(router_definitions, *pre_tasks):
    tornado.options.parse_command_line()
    router_definitions.append((r"/", TopPage))

    def _run():
        for task in pre_tasks:
            task()
        
        http_server = tornado.httpserver.HTTPServer(Application(router_definitions))
        http_server.listen(tornado.options.options.port)

        tornado.ioloop.IOLoop.instance().start()
    
    if __debug__:
        print("[debug mode] Type 'q' to stop the server.")
        t = threading.Thread(target=_run)
        t.setDaemon(True)
        t.start()

        while True:
            if input() == "q":
                sys.exit()
    else:
        print("[release mode]")
        _run()
