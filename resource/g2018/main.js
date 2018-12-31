const [SCREEN_WIDTH, SCREEN_HEIGHT] = [640, 960];
const FPS = 30;  // XXX

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
  game = new Game();

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
        text: "Hoge Title"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(7));
      
      Button({
        text: "Retry"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(12))
        .on("push", () => this.exit("GameScene"));
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
  
      Label({
        text: "GameScene"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(7));
      
      Button({
        text: "Clear"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(12))
        .on("push", () => this.exit("ResultScene"));
    },
    update() {
      game.update_objects(this);
      if (game.is_over()) {
        this.exit("ResultScene");
      }
    }
  });
  
  phina.define("ResultScene", {
    superClass: "DisplayScene",
    init (options) {
      this.superInit(options);
  
      Label({
        text: "ResultScene"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(7));
      
      Button({
        text: "End"
      }).addChildTo(this)
        .setPosition(this.gridX.center(), this.gridY.span(12))
        .on("push", () => this.exit("StartScene"));
    }
  });
}

function defineObjects() {
  phina.define("Man", {
    superClass: "Sprite",
    init() {
      this.superInit("man.png", 100, 100);
      this.setInteractive(true);
      this.on("pointstart", this.ontouch);
      
      this.motion = []
    },
    ontouch() {
      if (!game.is_fully_charged()) this.knockback();
    },
    update() {
      let vx = 0;
      let vy = 1;

      if (this.motion.length > 0) {
        let [motion, t] = this.motion.pop();

        if (motion == "knockback") {
          vx = 0;
          vy = -5;
        }
        
        if (t-- > 0) this.motion.push([motion, t]);
      }
      
      this.x += vx;
      this.y += vy;
    },
    knockback() {
      console.log("knockback");
      this.motion.push(["knockback", FPS * 0.1]);
    }
  });
}

class Game {
  constructor() {
    this.init();
  }
  init() {
    this.gage = 0;
    this.score = 0;
    this.objects = [];
    this.ability = null;
    this.spwan_timer = 0;
    this.spawn_span = FPS * 2;
  }
  update_objects(scene) {
    {
      let updated = [];

      // delete destroyed objects
      for (let o of this.objects) {
        if (!this.objects.is_destroyed) updated.push(o);
      }

      // spwan an object
      this.spwan_timer--;
      if (this.spwan_timer < 0) {
        this.spwan_timer = this.spwan_span;
        let o = Man().addChildTo(scene)
          .setPosition(scene.gridX.center(), scene.gridY.center());
        updated.push(o);
      }      

      this.objects = updated;
    }
    {
      // TOOD: update spawn span
    }
  }
  is_over() {
    for (let o of this.objects) {
      if (SCREEN_HEIGHT < o.y) return true;
    }
    return false;
  }
  charge() {
    if (!this.is_fully_charged()) this.gage++;
    if (this.is_fully_charged()) {
      this.ability = random_choice([
        "blackhole",
        "gong",
        "beam",
      ]);
    }
  }
  is_fully_charged() {
    return this.gage >= 10;
  }
  use_ability() {
    if (!this.is_fully_charged()) return;
    
    this.gage = 0;
    this.ability = null;

    // TODO: ability
  }
}

main();


// utils_________________________________________________

function random_choice(array) {
  if (array.length <= 0) {
    console.log("warning: array is empty");
    return null;
  }
  return array[Math.floor(Math.random() * array.length)];
}
