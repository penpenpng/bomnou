
// phinaの初期化
phina.globalize();

const [SCREEN_WIDTH, SCREEN_HEIGHT] = [640, 960];
const BAR_SIZE = 50;
const BAR_Y = 900;
const [BELL_WIDTH, BELL_HEIGHT] = [50, 50];
const [BN_WIDTH, BN_HEIGHT] = [50, 50];
const [BN_COLS, BN_ROWS] = [10, 6];
let g_score = 0;
let g_remain_bn = BN_COLS * BN_ROWS;

phina.define("GameoverScene", {
  superClass: "DisplayScene",
  init: function (options) {
    this.superInit();
    let text = `貴方は${g_score}個の煩悩を払って\n新年を迎えました`;
    Label({text: text})
      .addChildTo(this)
      .setPosition(this.gridX.center(), this.gridY.span(7));
    Button({text: "Retry"})
      .addChildTo(this)
      .setPosition(this.gridX.center(), this.gridY.span(12))
      .onpush = () => { this.exit("game") };
    Sprite("Gasho", 200, 150)
      .addChildTo(this)
      .setPosition(this.gridX.center(), this.gridY.span(3));
    Gasho()
      .addChildTo(this)
      .setPosition(this.gridX.center(), this.gridY.center());
  }
});

phina.define("Gasho", {
  superClass: "Sprite",
  init: function() {
    this.superInit("Gasho", 100, 100);
    this.t = 0
  },
  update: function() {
    if (this.t > 10) {
      this.remove();
      return;
    }

    this.setScale(1 + 3 * this.t, 1 + 3 * this.t);
    this.alpha = 1 - this.t * 0.1;
    
    this.t++;
  },
});

phina.define("GameScene", {
  superClass: "DisplayScene",
  init: function(options) {
    this.superInit(options);
    this.backgroundColor = "#EEE";
    
    g_score = 0;
    this.score = Label({
      text: "0",
      x: 30,
      y: 30,
      fill: "black",
    }).addChildTo(this);


    let bnGridX = Grid({
      columns: BN_COLS - 1,
      width: SCREEN_WIDTH * 0.85,
      offset: SCREEN_WIDTH * 0.15 / 2,
    });
    let bnGridY = Grid({
      columns: BN_ROWS - 1,
      width: SCREEN_HEIGHT * 0.3,
      offset: SCREEN_HEIGHT * 0.1,
    });

    this.objects = [];
    (BN_COLS).times((col) => {
      (BN_ROWS).times((row) => {
        let bn = Bomnou()
          .setPosition(bnGridX.span(col), bnGridY.span(row))
          .addChildTo(this);
        this.objects.push(bn);
      });
    });

    this.bell = Bell()
      .setPosition(30, SCREEN_HEIGHT - 30)
      .addChildTo(this);
    
    let deg = Math.random() * 60 + 20;
    this.bell.vx = Math.cos(deg / 180.0 * Math.PI);
    this.bell.vy = -Math.sin(deg / 180.0 * Math.PI);
    this.bell.v = 15;

    this.bar = Bar()
      .setPosition(this.gridX.center(), BAR_Y)
      .addChildTo(this);
  },

  update: function(app) {
    let bell = this.bell;
    
    { // 煩悩との衝突判定
      let x_bound = false;
      let y_bound = false;
      this.objects.forEach((bn) => {
        let bound = collide(bell, bn);
        x_bound = x_bound || bound == X_COLLISION;
        y_bound = y_bound || bound == Y_COLLISION;
        if (bound != NO_COLLISION) {
          bn.alive = false;
          g_score++;
          this.score.text = "" + g_score;
        }
      });
      if (x_bound) bell.vx *= -1;
      if (y_bound) bell.vy *= -1;
    }

    { // 壁との衝突判定
      if (bell.x < bell.width / 2.0) {
        bell.x = bell.width / 2.0 + 1;
        bell.vx = Math.abs(bell.vx);
      }
      if (SCREEN_WIDTH - bell.width / 2.0 < bell.x) {
        bell.x = SCREEN_WIDTH - bell.width / 2.0 - 1;
        bell.vx = -Math.abs(bell.vx);
      }
      if (bell.y < bell.height / 2.0) {
        bell.y = bell.height / 2.0 + 1;
        bell.vy = Math.abs(bell.vy);
      }
    }

    { // ゲームオーバー判定
      if (SCREEN_HEIGHT < bell.y || g_remain_bn <= 0) {
        this.exit("gameover");
      }
    }

    { // 撞木の移動
      this.bar.x = app.pointer.x;
    }
  },

  onclick: function() {
    this.bar.poke();

    let bell = this.bell;
    let bar = this.bar;
    if (BAR_Y - BAR_SIZE * 1.5 < bell.y && bell.y < BAR_Y &&
        bar.x - BAR_SIZE / 2.0 < bell.x && bell.x < bar.x + BAR_SIZE / 2.0) {
      SoundManager.play("BellSE");
      bell.vx *= -1;
      bell.vy *= -1;
      let deg = Math.random() * 10 - 5;
      [bell.vx, bell.vy] = rotate(bell.vx, bell.vy, deg);
      
      g_score++;
      this.score.text = "" + g_score;
    }
  }

});

function rotate(x, y, deg) {
  return [
    x * Math.cos(deg / 180.0 * Math.PI) - y * Math.sin(deg / 180.0 * Math.PI),
    x * Math.sin(deg / 180.0 * Math.PI) + y * Math.cos(deg / 180.0 * Math.PI),
  ];
} 

phina.define("Bell", {
  superClass: "Sprite",
  init: function() {
    this.superInit("Bell", BELL_WIDTH, BELL_HEIGHT);
    this.vx = 0;
    this.vy = 0;
    this.v = 1;
  },
  update: function() {
    this.x += this.v * this.vx;
    this.y += this.v * this.vy;
    this.rotation += 8;
  }
});

phina.define("Bomnou", {
  superClass: "Label",
  init: function() {
    this.superInit({
      text: "煩悩",
      fontSize: "20",
      fill: "black",
      backgroundColor: "#CCC",
    });
    this.alive = true;
  },
  update: function() {
    if (!this.alive) {
      Effect(this).addChildTo(this.parent);
      SoundManager.play("BellSE");
      this.remove();
    }
  }
});

phina.define("Effect", {
  superClass: "Label",
  init: function (bn) {
    this.superInit({
      text: "涅槃",
      fontSize: "20",
      fill: "blue",
    });
    this.x = bn.x;
    this.y = bn.y;
    this.t = 0;
  },
  update: function () {
    this.t++;
    if (this.t > 20) {
      this.remove();
      return;
    }
    this.y--;
    this.alpha = (20 - this.t)/20.0;
  }
});

phina.define("Bar", {
  superClass: "Sprite",
  init: function() {
    this.superInit("Bar", 50, 50);
    this.setRotation(-45);
    this.anime_t = 0;
  },

  update: function() {
    if (this.anime_t > 0) {
      let k = 1 + this.anime_t / 10.0;
      this.setScale(k, k);
      this.anime_t--;
    }
  },

  poke: function() {
    this.anime_t = 10;
  }  
})

const NO_COLLISION = 0;
const X_COLLISION = 1;
const Y_COLLISION = -1;
function collide(bell, obj) {
  if (!obj.alive) return NO_COLLISION;

  let dr_x = bell.vx > 0 ? -1 : 1;
  let dr_y = bell.vy > 0 ? -1 : 1;

  let dis_x = (bell.x - obj.x) * dr_x;
  let th_x = (bell.width + obj.width) / 2;
  let ago_x = (th_x - dis_x) / Math.abs(bell.vx);
  if (Math.abs(dis_x) > th_x) ago_x = -1;

  let dis_y = (bell.y - obj.y) * dr_y;
  let th_y = (bell.height + obj.height) / 2;
  let ago_y = (th_y - dis_y) / Math.abs(bell.vy);
  if (Math.abs(dis_y) > th_y) ago_y = -1;

  if (0 < ago_x && 0 < ago_y && ago_y < ago_x) {
    return X_COLLISION;
  }
  if (0 < ago_x && 0 < ago_y && ago_x < ago_y) {
    return Y_COLLISION;
  }
  return NO_COLLISION;
}

const ASSETS = {
  image: {
    "Bomnou": bom,
    "Bell": bel,
    "Bar": bar,
    "Gasho": gas,
  },
  sound: {
    "BellSE": bse,
  }
};

const SCENES = [
  {
    className: "GameScene",
    label: "game",
  },
  {
    className: "GameoverScene",
    label: "gameover",
  },
];

phina.main(function() {
  var app = GameApp({
    startLabel: "game",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    assets: ASSETS,
    scenes: SCENES,
  });
  app.run();
});

