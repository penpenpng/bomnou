
function main() {
  let req = new XMLHttpRequest();
  req.open("GET", `${location.origin}/g2018/assets`);
  req.onload = () => {
    if (req.status === 200) {
      game_setup(JSON.parse(req.responseText));
    } else {
      alert("Connection Error");
    }
  }
  req.send();
}

function game_setup(assets) {
  phina.globalize();

  defineScenes();
  defineObjects();

  phina.main(function () {
    GameApp({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      startLabel: "StartScene",
      scenes: [
        {
          className: "StartScene",
          label: "StartScene",
        },
        {
          className: "GameScene",
          label: "GameScene",
        },
        {
          className: "ResultScene",
          label: "ResultScene",
        },
      ],
      assets: assets,
      fps: FPS,
    }).run();
  });
}

function defineScenes() {
  phina.define("StartScene", {
    superClass: "DisplayScene",
    init (options) {
      this.superInit(options);
  
      Label({
        text: "初詣チャレンジ！"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(7));
      
      Button({
        text: "はじめる"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(12))
        .on("push", () => {
          play_se("gong.mp3", 0.8);
          this.exit("GameScene")
        });
    },
    update () {
      
      // for Debug
      this.exit("GameScene");

    }
  });
  
  phina.define("GameScene", {
    superClass: "DisplayScene",
    init (options) {
      this.superInit(options);

      this.game_layer = DisplayElement().addChildTo(this);
      this.ui_layer = DisplayElement().addChildTo(this);

      Sprite("bg.png", SCREEN_WIDTH, SCREEN_HEIGHT)
        .addChildTo(this.game_layer)
        .setPosition(this.gridX.center(), this.gridY.center());
      
      OfferingBox()
        .addChildTo(this.game_layer)
        .setPosition(this.gridX.center(), this.gridY.span(13));
      
      Gage()
        .addChildTo(this.ui_layer)
        .setPosition(this.gridX.center(), this.gridY.span(15));
      
      this.score_display = Label({
        text: "",
        originX: 0,
        originY: 0,
        x: 30,
        y: 30,
        backgroundColor: "white",
        fill: "black",
      }).addChildTo(this.ui_layer);
      
      game = new Game(this.game_layer);
      SoundManager.playMusic("neorock70.mp3");

      this.setInteractive(true);
      this.on("pointstart", this.ontouch);
    },
    ontouch(e) {
      game.summon_boar(e.pointer.x, e.pointer.y);
    },
    update() {
      game.update_objects();
      this.score_display.text = `Score: ${game.score}`;
      if (game.is_over()) {
        this.exit("ResultScene");
      }
    }
  });
  
  phina.define("ResultScene", {
    superClass: "DisplayScene",
    init (options) {
      this.superInit(options);
  
      Sprite("gasho.png", 200, 150)
        .addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(3));
      
      Label({
        text: `貴方は${game.kill}人なぎ倒して\n${game.score}点を獲得しました！`,
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(7));
      
      Button({
        text: "もういっかい！",
        width: 250,
      }).addChildTo(this)
        .setPosition(this.gridX.span(4), this.gridY.span(12))
        .on("push", () => this.exit("StartScene"));
      
      Button({
        text: "Tweet"
      }).addChildTo(this)
        .setPosition(this.gridX.span(12), this.gridY.span(12))
        .on("click", () => {
          window.open("about:blanck").location.href = phina.social.Twitter.createURL({
            text: `私は${game.kill}人の参拝客をなぎ倒して${game.score}点を獲得しました！`,
            hashtags: ["初詣チャレンジ"],
          });
        });
      
      SoundManager.stopMusic();
    }
  });
}

function defineObjects() {
  phina.define("TargetObject", {
    superClass: "Sprite",
    init() {
      this.superInit(random_choice([
        "man.png",
        "old_man.png",
        "running_man.png",
        "woman.png",
        "old_woman.png",
        "running_woman.png",
      ]), 90, 135);
      this.setInteractive(true);
      this.on("pointstart", this.ontouch);
      
      this.motion = []
      this.is_destroyed = false;
    },
    ontouch() {
      if (!game.can_use_ability() && !this.is_destroyed) {
        this.motion.push(new Motion("knockback"));
        play_se("punch.mp3", 0.8);
      }
    },
    update() {
      let vx = 0;
      let vy = 5;

      if (this.motion.length > 0) {
        let motion = this.motion.pop();
        motion.tick();

        if (motion.is_destruction) {
          vx = 0;
          vy = 0;
        }
        if (motion.type == "explosion") {
          let t = motion.norm_t();
          let k = t * 1.5;
          this.setScale(k, k);
          this.alpha = 1 - t;
        }
        if (motion.type == "knockback") {
          vx = 0;
          vy = -15;
        }
        
        if (!motion.is_over()) {
          this.motion.push(motion);
        }
        if (motion.is_over() && motion.is_destruction) {
          this.remove();
          return;
        }
      }
      
      this.x += vx;
      this.y += vy;
    },
    destroy(effect) {
      this.is_destroyed = true;
      this.motion.push(new Motion(effect));
      if (effect == "explosion") {
        this.setImage("explosion.png", 100, 100)
          .setScale(0, 0);
      }
    }
  });

  phina.define("Boar", {
    superClass: "Sprite",
    init(x, y) {
      this.superInit("boar.png", 100, 100);
      this.direction = random_choice([
        "up",
        "right",
        "left",
      ]);

      if (this.direction == "up") {
        this.setPosition(x, SCREEN_HEIGHT);
      } else if (this.direction == "right") {
        this.setPosition(0, y);
        this.scaleX *= -1;
      } else if (this.direction == "left") {
        this.setPosition(SCREEN_WIDTH, y);
      }
    },
    update() {
      if (this.direction == "up") {
        this.y -= ENV.BOAR_SPEED;
      } else if (this.direction == "right") {
        this.x += ENV.BOAR_SPEED;
      } else if (this.direction == "left") {
        this.x -= ENV.BOAR_SPEED;
      }

      for (let o of game.objects) {
        if (this.hitTestElement(o)) {
          o.destroy("explosion");
          game.score += ENV.BOAR_SCORE;
          game.kill++;
          play_se("explosion.mp3", 0.8);
        }
      }

      if (this.y < 0 || this.x < 0 || SCREEN_WIDTH < this.x) {
        this.remove();
      }
    },
  });

  phina.define("OfferingBox", {
    superClass: "Sprite",
    init() {
      this.superInit("offering_box.png", 100, 100);
      this.setInteractive(true);
      this.on("pointstart", this.ontouch);
      
      this.motion = []
    },
    ontouch(e) {
      console.log(e);
      if (!game.can_use_ability()) {
        game.charge();
        play_se("coin.mp3", 2);
        this.motion.push(["pop", FPS * 0.2, 0]);
      }
    },
    update() {
      if (this.motion.length > 0) {
        let [motion, end, t] = this.motion.pop();

        if (motion == "pop") {
          // TODO: this.setScale(x, y);
        }
        
        if (t++ > end) this.motion.push([motion, end, t]);
      }
    },
  });

  phina.define("Gage", {
    superClass: "DisplayElement",
    init() {
      this.superInit();

      this.frame = RectangleShape({
        height: 20,
        width: SCREEN_WIDTH - 100,
        strokeWidth: 4,
        stroke: "black",
        fill: "transparent",
        backgroundColor: "white",
      }).addChildTo(this)
      this.gage = RectangleShape({
        height: 15,
        originX: 0,
        strokeWidth: 0,
        fill: "skyblue",
      }).addChildTo(this.frame)
        .setPosition(-(SCREEN_WIDTH - 100 + 14) / 2, 0);  // XXX
    },
    update() {
      this.gage.width = game.gage / 10 * (SCREEN_WIDTH - 100 - 2);  // XXX
      this.gage.fill = game.can_use_ability() ? "gold" : "skyblue";
    },
  });
}

class Motion {
  constructor(type) {
    this.type = type;
    this.t = 0;
    this.is_destruction = type == "explosion";
    this.lifetime = FPS * function () {
      if (type == "knockback") return 0.2;
      if (type == "explosion") return 1;
      return 1;
    }();
  }
  is_over() {
    return this.t > this.lifetime;
  }
  tick() {
    this.t++;
  }
  norm_t() {
    return this.t / this.lifetime;
  }
}

class Game {
  constructor(game_layer) {
    this.game_layer = game_layer;
    this.gage = 0;
    this.score = 0;
    this.kill = 0;
    this.objects = [];
    this.ability = null;
    this.spawn_timer = 0;
    this.spawn_span = FPS * 2;
    this.boar_CD_timer = 0;
  }
  update_objects() {
    {
      let updated = [];

      // delete destroyed objects
      for (let o of this.objects) {
        if (!o.is_destroyed) updated.push(o);
      }

      // spwan an object
      this.spawn_timer--;
      if (this.spawn_timer < 0) {
        this.spawn_timer = this.spawn_span;
        let o = TargetObject().addChildTo(this.game_layer)
          .setPosition(random_range(100, SCREEN_WIDTH - 100), -100);
        updated.push(o);
      }      

      this.objects = updated;
    }
    {
      // TOOD: update spawn span
    }
    {
      if (!this.can_summon_boar()) this.boar_CD_timer--;
    }
  }
  is_over() {
    for (let o of this.objects) {
      if (SCREEN_HEIGHT < o.y) return true;
    }
    return false;
  }
  charge() {
    this.score += ENV.CHARGE_SCORE;
    if (!this.can_use_ability()) this.gage++;
    if (this.can_use_ability()) {
      this.ability = random_choice([
        "blackhole",
        "gong",
        "beam",
      ]);
    }
  }
  can_use_ability() {
    return this.gage >= 10;
  }
  use_ability() {
    if (!this.can_use_ability()) return;
    
    this.gage = 0;
    this.ability = null;

    // TODO: ability
  }
  summon_boar(x, y) {
    if (this.can_summon_boar() && !this.can_use_ability()) {
      Boar(x, y).addChildTo(this.game_layer);
      this.boar_CD_timer = ENV.BOAR_CD
    };
  }
  can_summon_boar() {
    return this.boar_CD_timer <= 0;
  }
}

const [SCREEN_WIDTH, SCREEN_HEIGHT] = [640, 960];
const FPS = 30;  // XXX
const ENV = {
  BOAR_CD: 0.5 * FPS,
  BOAR_SPEED: 450 / FPS,
  BOAR_SCORE: 50,
  CHARGE_SCORE: 50,
}

main();


// utils_________________________________________________

function random_range(s, e) {
  return Math.random() * Math.abs(e - s) + Math.min(s, e);
}

function random_choice(array) {
  if (array.length <= 0) {
    console.log("warning: array is empty");
    return null;
  }
  return array[Math.floor(Math.random() * array.length)];
}

function play_se(name, volume) {
  let default_volume = SoundManager.getVolume();
  SoundManager.setVolume(volume);
  SoundManager.play(name);
  SoundManager.setVolume(default_volume);
}
