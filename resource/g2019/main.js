function main() {
    fetchAssets(loadGame);
}

function fetchAssets(callback) {
    const req = new XMLHttpRequest();
    req.open("GET", `${location.origin}/g2019/assets`);
    req.onload = () => {
        if (req.status === 200)
            callback(JSON.parse(req.responseText));
        else
            alert("Connection Error");
    }
    req.send();
}

function loadGame(assets) {
    function Scene(name) {
        return {
            className: name,
            label: name,
        };
    }

    const appArg = {
        width: ENV.SCREEN_WIDTH,
        height: ENV.SCREEN_HEIGHT,
        startLabel: "StartScene",
        scenes: [
            Scene("StartScene"),
            Scene("MainScene"),
            Scene("ResultScene"),
        ],
        fps: ENV.FPS,
        assets: assets,
    };

    phina.globalize();
    definePhinaObjects();
    definePhinaScenes();
    phina.main(() => GameApp(appArg).run());
}

function definePhinaScenes() {
    phina.define("StartScene", {
        superClass: "DisplayScene",
        init () {
            this.superInit();

            Label({
                text: "ねずみ作り",
                fontSize: 70,
            })
                .addChildTo(this)
                .setPosition(this.gridX.center(), this.gridY.span(2));

            Label({
                text: "ネズミ年なのにネズミが足りない！\n昨年余ったイノシシを合成して\n君だけのネズミを創り出せ！\n\nイノシシは危険なので\n\n外に逃がしたり\n溢れさせたり\n対消滅させたり\n\nしないように気をつけよう！！"
            })
                .addChildTo(this)
                .setPosition(this.gridX.center(), this.gridY.span(7));

            Button({
                text: "はじめる"
            })
                .addChildTo(this)
                .setPosition(this.gridX.center(), this.gridY.span(12))
                .on("push", () => {
                    this.exit("MainScene")
                });
        },
    });

    phina.define("MainScene", {
        superClass: "DisplayScene",
        init() {
            SoundManager.playMusic("bgm_maoudamashii_orchestra23.mp3");

            this.superInit();
            this.setInteractive(true);

            // create layers
            this.layers = {
                back: DisplayElement().addChildTo(this),
                main: DisplayElement().addChildTo(this),
                ui: DisplayElement().addChildTo(this),
            };

            // initialize objects
            this.objects = {
                bg: Sprite("universe.jpg", 1920, 960)
                    .setPosition(this.gridX.center(), this.gridY.center())
                    .addChildTo(this.layers.back),
                boars: [],
                cursor: AimingCursor()
                    .addChildTo(this.layers.ui),
                life: LifeIndicator()
                    .setPosition(this.gridX.span(2), this.gridY.span(14))
                    .addChildTo(this.layers.ui),
                score: Label({
                    fill: "white",
                    fontSize: 30,
                    align: "left",
                })
                    .setPosition(this.gridX.span(8.5), this.gridY.span(14))
                    .addChildTo(this.layers.ui),
                gage: BoarGage(ENV.SCREEN_WIDTH - 100)
                    .setPosition(this.gridX.center(), this.gridY.span(15))
                    .addChildTo(this.layers.ui),
            };


            // intialize game properties
            this.levelTimer = 0;
            this.spawnTimer = 0;
            this.lastUsedPolarity = null;
            this.combo = 1;
            this.mouses = 0;
            this.levels = JSON.parse(JSON.stringify(GAME_PROP.LEVEL));
            this.setLife(3);
            this.setScore(0);
            this.setBoars(0);
            for (let i = 0; i < GAME_PROP.INIT_BOARS; i++) this.generateBoar();
        },
        update() {
            function isVanishing(boar) {
                return boar.state === BoarState.Combine || boar.state === BoarState.Annihilate;
            }

            function isOutOfDisplay(boar) {
                const { x, y } = boar;
                return (x < 0 || ENV.SCREEN_WIDTH < x || y < 0 || ENV.SCREEN_HEIGHT < y);
            }

            // detect collision
            const boars = this.objects.boars;
            for (let i = 0; i < boars.length; i++) {
                const boar_i = boars[i];
                if (isVanishing(boar_i)) continue;
                for (let j = i + 1; j < boars.length; j++) {
                    const boar_j = boars[j];
                    if (isVanishing(boar_j)) continue;

                    const collides = boar_i.hitTestElement(boar_j);
                    if (collides) {
                        if (boar_i.polarity === boar_j.polarity) {
                            boar_i.combineWith(boar_j);
                            this.setBoars(this.boars - 2);
                            if (this.lastUsedPolarity != boar_i.polarity) {
                                this.combo++;
                                this.setScore(this.score + this.combo * 10);
                            } else {
                                this.combo = 1;
                                this.setScore(this.score + 10);
                            }
                            this.mouses++;
                            this.lastUsedPolarity = boar_i.polarity;
                        } else {
                            this.combo = 1;
                            this.lastUsedPolarity = null;
                            boar_i.annihilateWith(boar_j);
                            this.setBoars(this.boars - 2);
                            this.setLife(this.life - 1);
                        }
                        break;
                    }
                }
            }

            // dispose boars
            const leftBoars = [];
            for (let b of boars) {
                if (!isOutOfDisplay(b) && !isVanishing(b)) leftBoars.push(b);
                if (isOutOfDisplay(b)) {
                    this.combo = 1;
                    this.lastUsedPolarity = null;
                    b.explode();
                    this.setBoars(this.boars - 1);
                    this.setLife(this.life - 1);
                }
            }
            this.objects.boars = leftBoars;

            // judge gameover
            if (this.life <= 0 || this.boars >= GAME_PROP.MAX_BOARS)
                this.exit("ResultScene", {
                    mouses: this.mouses,
                    score: this.score
                });
            
            // spawn boars
            this.levelTimer += 1 / ENV.FPS;
            this.spawnTimer += 1 / ENV.FPS;
            const [levelSpan, spawnSpan, spawnCount] = this.levels[0];
            if (this.levels.length > 1 && levelSpan < this.levelTimer) {
                this.levels.shift();
                this.levelTimer = 0;
                console.log("level up");
            } else if (spawnSpan < this.spawnTimer) {
                this.spawnTimer = 0;
                for (let i = 0; i < spawnCount; i++) this.generateBoar();
            }
        },
        generateBoar() {
            const polarity = randomChoice(Polarity.enumerate());
            const newBoar = Boar(polarity)
                .setPosition(randomRange(0, ENV.SCREEN_WIDTH), randomRange(0,  this.gridY.span(13)));

            let needToRetry = false;
            for (let b of this.objects.boars) {
                needToRetry |= newBoar.hitTestElement(b);
                if (needToRetry) break;
            }

            if (needToRetry) {
                this.generateBoar();
            } else {
                newBoar.addChildTo(this.layers.main);
                this.objects.boars.push(newBoar);
                this.setBoars(this.boars + 1);
            }
        },
        setLife(life) {
            this.life = Math.max(life, 0);
            this.objects.life.setLife(this.life);
        },
        setScore(score) {
            this.score = +score;
            this.objects.score.text = `Score: ${+score}`;
        },
        setBoars(boars) {
            this.boars = +boars;
            this.objects.gage.setValue(Math.min(1, this.boars / GAME_PROP.MAX_BOARS));
        },
    });

    phina.define("ResultScene", {
        superClass: "DisplayScene",
        init(params) {
            this.superInit();
            SoundManager.stopMusic();
            playSoundEffect("wafu.mp3");

            const { score, mouses } = params;

            Sprite("gasho.png", 200, 150)
                .addChildTo(this)
                .setPosition(this.gridX.center(), this.gridY.span(3));

            Label({
                text: `貴方はイノシシから\n${mouses}匹のネズミを合成し\n${score}点を獲得しました！`,
            })
                .addChildTo(this)
                .setPosition(this.gridX.center(), this.gridY.span(7));

            Button({
                text: "もういっかい！",
                width: 250,
            })
                .addChildTo(this)
                .setPosition(this.gridX.span(4), this.gridY.span(12))
                .on("push", () => this.exit("MainScene"));

            Button({
                text: "Tweet"
            })
                .addChildTo(this)
                .setPosition(this.gridX.span(12), this.gridY.span(12))
                .on("click", () => {
                    const date = new Date();
                    let message;
                    if (date.getFullYear() >= 2020) {
                        message = `あけましておめでとうございます！私は昨年余ったイノシシから${mouses}匹のネズミを合成して${score}点を獲得しました！`;
                    } else {
                        message = `私は今年余ったイノシシから来年のためのネズミを${mouses}匹合成して${score}点を獲得しました！良いお年を！`;
                    }

                    window.open("about:blanck").location.href = phina.social.Twitter.createURL({
                        text: message,
                        hashtags: ["ねずみ作り2020"],
                    });
                });
        }
    });
}

function definePhinaObjects() {
    phina.define("Boar", {
        superClass: "RectangleShape",
        init(polarity) {
            this.superInit();

            // add sprite
            const IMAGE_FILE =
                polarity === Polarity.Positive ?
                    "posBoar.png" : "negBoar.png";
            const BOAR_SIZE = 100;
            this.sprite = Sprite(IMAGE_FILE, BOAR_SIZE, BOAR_SIZE)
                .addChildTo(this)
                .setInteractive(true)
                .on("pointstart", () => {
                    if (this.state !== BoarState.Stay) return;

                    this.state = BoarState.Move;

                    const cursor = this.parent.parent.objects.cursor;
                    const [dx, dy] = cursor.getDirection(this.polarity);
                    this.dx = dx;
                    this.dy = dy;
                });

            this.stroke = "transparent";
            this.fill = "transparent";

            this.state = BoarState.Stay;
            this.polarity = polarity;
            this.dx = 0;   // normalized speed vector (x component)
            this.dy = 0;   // normalized speed vector (y component)
            this.t = 0;    // frame counter used in vanishing animation
        },
        update() {
            if (this.state === BoarState.Move) {
                this.x += GAME_PROP.BOAR_SPEED / ENV.FPS * this.dx;
                this.y += GAME_PROP.BOAR_SPEED / ENV.FPS * this.dy;
            } else if (this.state === BoarState.Combine) {
                this.t++;
                const ANIMATION_SPAN = 30;
                const SLIDE_DIST = 50;

                if (this.t > ANIMATION_SPAN) {
                    this.remove()
                    return;
                }

                const nt = this.t / ANIMATION_SPAN;
                this.sprite.setPosition(0, -nt * SLIDE_DIST);
                this.sprite.alpha = nt;
            } else if (this.state === BoarState.Annihilate) {
                this.t++;
                const ANIMATION_SPAN = 30;

                if (this.t > ANIMATION_SPAN) {
                    this.remove()
                    return;
                }

                const nt = this.t / ANIMATION_SPAN;
                this.sprite.setScale(nt * 1.5, nt * 1.5);
                this.sprite.alpha = nt;
            }
        },
        combineWith(otherBoar) {
            playSoundEffect("combine.mp3")

            const { x, y } = this;
            const ox = otherBoar.x;
            const oy = otherBoar.y;

            this.state = otherBoar.state = BoarState.Combine;
            this.sprite.setImage("mouse.png", 100, 100);
            this.sprite.alpha = 1;
            this.x = (x + ox) / 2;
            this.y = (y + oy) / 2;

            otherBoar.remove();
        },
        annihilateWith(otherBoar) {
            playSoundEffect("explosion.mp3")

            const { x, y } = this;
            const ox = otherBoar.x;
            const oy = otherBoar.y;

            this.state = otherBoar.state = BoarState.Annihilate;
            this.sprite.setImage("explosion.png", 100, 100);
            this.sprite.setScale(0, 0);
            this.sprite.alpha = 1;
            this.x = (x + ox) / 2;
            this.y = (y + oy) / 2;

            otherBoar.remove();
        },
        explode() {
            playSoundEffect("explosion.mp3")

            this.state = BoarState.Annihilate;
            this.sprite.setImage("explosion.png", 100, 100);
            this.sprite.setScale(0, 0);
            this.sprite.alpha = 1;
        }
    });

    phina.define("AimingCursor", {
        superClass: "DisplayElement",
        init() {
            this.superInit();

            // frames per a cycle
            this.T = Math.floor(360 * ENV.FPS / GAME_PROP.ROTATE_SPEED);
            // frame counter
            this.t = 0;

            const RADIUS = 60;
            const ARROW_WIDTH = 90;
            const ARROW_HEIGHT = 90
            Sprite("posArrow.png", ARROW_WIDTH, ARROW_HEIGHT)
                .setPosition(-RADIUS, 0)
                .addChildTo(this);
            Sprite("negArrow.png", ARROW_WIDTH, ARROW_HEIGHT)
                .setPosition(RADIUS, 0)
                .addChildTo(this);
        },
        update(app) {
            // update props
            this.t = (this.t + 1) % this.T;
            const theta = 2 * Math.PI / this.T * this.t;
            this.cos = Math.cos(theta);
            this.sin = Math.sin(theta);

            // rotate
            this.rotation = 360 / this.T * this.t;

            // stalk mouse
            const { x, y } = app.pointer;
            this.setPosition(x, y);
        },
        getDirection(polarity) {
            if (polarity === Polarity.Positive) {
                return [-this.cos, -this.sin];
            } else if (polarity === Polarity.Negative) {
                return [this.cos, this.sin];
            }
            throw Error("Invalid Polarity");
        },
    });

    phina.define("LifeIndicator", {
        superClass: "DisplayElement",
        init() {
            this.superInit();
            this.life = 0;
            this.hearts = [];
        },
        setLife(life) {
            if (life == this.life) return;
            this.life = life;

            const HEART_SIZE = 80;
            const MARGIN = 20;

            // clear hearts
            for (let h of this.hearts) h.remove();
            this.hearts = [];

            // set hearts
            for (let i = 0; i < life; i++) {
                const h = Sprite("heart.png", HEART_SIZE, HEART_SIZE)
                    .setPosition(i * (HEART_SIZE + MARGIN), 0)
                    .addChildTo(this);
                this.hearts.push(h);
            }
        }
    });

    phina.define("BoarGage", {
        superClass: "DisplayElement",
        init(width) {
            this.superInit();

            this.MAX_WIDTH = width;

            // render frame
            RectangleShape({
                height: 20,
                width: this.MAX_WIDTH + 2,
                strokeWidth: 4,
                stroke: "black",
                fill: "transparent",
                backgroundColor: "white",
            }).addChildTo(this)

            this.gage = RectangleShape({
                height: 15,
                originX: 0,
                strokeWidth: 0,
            })
                .setPosition(-(this.MAX_WIDTH + 14) / 2, 0)
                .addChildTo(this);
        },
        setValue(val) {
            this.gage.width = val * (this.MAX_WIDTH - 2);
            if (val < 0.5) {
                this.gage.fill = "skyblue";
            } else if (val < 0.8) {
                this.gage.fill = "orange";
            } else {
                this.gage.fill = "red";
            }
        },
    });
}

function playSoundEffect(name, volume = null) {
    const defaultVolume = SoundManager.getVolume();
    if (volume == null) volume = defaultVolume;
    SoundManager.setVolume(volume);
    SoundManager.play(name);
    SoundManager.setVolume(defaultVolume);
}

function randomRange(s, e) {
    return Math.random() * Math.abs(e - s) + Math.min(s, e);
}

function randomChoice(array) {
    if (array.length <= 0) {
        throw Error("Empty Array");
    }
    return array[Math.floor(Math.random() * array.length)];
}

const ENV = {
    SCREEN_WIDTH: 640,
    SCREEN_HEIGHT: 960,
    FPS: 30,
};

const GAME_PROP = {
    INIT_BOARS: 10,
    MAX_BOARS: 50,
    BOAR_SPEED: 400,    // distance per sec
    ROTATE_SPEED: 80,   // degree per sec
    LEVEL: [
        // level span, spawn span, spawn count
        [8, 0.7, 1],
        [8, 0.5, 1],
        [8, 0.4, 1],
        [8, 0.7, 2],
        [8, 0.6, 2],
        [8, 0.5, 2],
    ],
};

const Polarity = {
    Positive: "positive",
    Negative: "negative",
    enumerate() {
        return [Polarity.Positive, Polarity.Negative];
    }
};

const BoarState = {
    Stay: "stay",              // initial state
    Move: "move",              // after kicked
    Annihilate: "annihilate",  // after collision with an antipolar boar
    Combine: "combine",        // after collision with a homopolar boar
};


window.addEventListener("load", main);
