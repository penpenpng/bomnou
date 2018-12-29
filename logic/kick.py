import tornado.options
from tornado.options import define
import server
import g2017
import g2018


define(
    "port",
    type=int,
    default=5000,
    help="run on the given port")
define(
    "debug",
    type=bool,
    default=False,
    help="run as local debug mode if true")
tornado.options.parse_command_line()


DEBUG = tornado.options.options.debug


server.start([
    *g2017.handlers,
    *g2018.handlers,
], debug=DEBUG)
