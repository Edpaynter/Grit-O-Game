// ================================================ GLOBAL ELEMENTS ================================================ //

let game;
var playerScore = 0;
var scoreText;
var timeText;
var interval;
var scoreInterval;

// ----- GENERAL GAME SETTINGS ----- //

let gameOptions = {

    // platform speed range, in pixels per second
    platformSpeedRange: [300, 300],

    // mountain speed, in pixels per second
    mountainSpeed: 500,

    // spawn range, how far should be the rightmost platform from the right edge
    // before next platform spawns, in pixels
    spawnRange: [80, 300],

    // platform width range, in pixels
    platformSizeRange: [90, 300],

    // a height range between rightmost platform and next platform to be spawned
    platformHeightRange: [-5, 5],

    // a scale to be multiplied by platformHeightRange
    platformHeighScale: 20,

    // platform max and min height, as screen height ratio
    platformVerticalLimit: [0.4, 0.8],

    // player gravity
    playerGravity: 950,

    // player jump force
    jumpForce: 400,

    // player starting X position
    playerStartPosition: 600,

    // consecutive jumps allowed
    jumps: 2,

    // % of probability a coin appears on the platform
    coinPercent: 100,

}

// ----- PHASER CONFIGURATIONS ----- //

window.onload = function () {

    // object containing configuration options
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: "#000000",

        // physics settings
        physics: {
            default: "arcade"
        },

        // audio config disabling chrome's feature to stop autoplay
        audio: {
            disableWebAudio: true,
            noAudio: false
        },
    }

    // creates game
    game = new Phaser.Game(gameConfig);

    // makes the window resize to fit the screen
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

// ================================================ PRE-LOAD ================================================ //

class preloadGame extends Phaser.Scene {

    constructor() {
        super("PreloadGame");
    }

    // ----- LOAD IN GAME ELEMENTS ----- //

    preload() {

        // add in the game background music
        this.load.audio("background-music", "assets/audio/background-music.mp3");

        // add platform to be used
        this.load.image("platform", "assets/images/platform.png");

        // add in gritt-o
        this.load.spritesheet("player", "assets/images/player.png", {
            frameWidth: 24,
            frameHeight: 48
        });

        // add coin
        this.load.spritesheet("coin", "assets/images/coin.png", {
            frameWidth: 20,
            frameHeight: 20
        });

        // add mountains
        this.load.spritesheet("mountain", "assets/images/mountain.png", {
            frameWidth: 512,
            frameHeight: 512
        });
    }

    // ----- SET UP ANIMATIONS ----- //

    create() {

        // setting player animation
        this.anims.create({
            key: "run",
            frames: this.anims.generateFrameNumbers("player", {
                start: 0,
                end: 1
            }),
            frameRate: 10,
            repeat: -1
        });

        // setting coin animation
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("coin", {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        // starts the scene called "PlayGame"
        this.scene.start("PlayGame");
    }
}

// ================================================ MAIN GAME ================================================ //
class playGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
    }
    create() {

        // --------------- AUDIO ELEMENTS --------------- //

        // create a music variable and assign our loaded "background-music"
        var music = this.sound.add('background-music');

        // make it so it loops
        music.setLoop(true);

        // set to play
        music.play();

        // --------------- TIME & SCORE ELEMENTS --------------- //

        // create and place time text
        timeText = this.add.text(160, 120, "Time: ", { fontSize: '32px', fill: '#8c5a96' });

        // create a variable to capture the initial time
        var start = new Date;

        // set an interval function to update the timetext every millisecond
        interval = setInterval(function () {
            timeText.text = "Time: " + ((new Date - start) / 1000);
        });

        // set an interval function to add to the score with the time
        scoreInterval = setInterval(function () {
            playerScore += 10;
            scoreText.text = 'Score: ' + playerScore;
        }, 100);

        // create score text
        scoreText = this.add.text(160, 160, 'Score: 0', { fontSize: '32px', fill: '#ea6118' });

        // --------------- GROUPS & POOLS --------------- //

        // group with all active mountains.
        this.mountainGroup = this.add.group();

        // group with all active platforms.
        this.platformGroup = this.add.group({

            // once a platform is removed, it's added to the pool
            removeCallback: function (platform) {
                platform.scene.platformPool.add(platform)
            }
        });

        // platform pool
        this.platformPool = this.add.group({

            // once a platform is removed from the pool, it's added to the active platforms group
            removeCallback: function (platform) {
                platform.scene.platformGroup.add(platform)
            }
        });

        // group with all active coins.
        this.coinGroup = this.add.group({

            // once a coin is removed, it's added to the pool
            removeCallback: function (coin) {
                coin.scene.coinPool.add(coin)
            }
        });

        // coin pool
        this.coinPool = this.add.group({

            // once a coin is removed from the pool, it's added to the active coins group
            removeCallback: function (coin) {
                coin.scene.coinGroup.add(coin)
            }
        });

        // group with all active firecamps. ---- removing this breaks the game
        this.fireGroup = this.add.group({

            // once a firecamp is removed, it's added to the pool
            removeCallback: function (fire) {
                fire.scene.firePool.add(fire)
            }
        });


        // --------------- ADDING & INITILIAZING OBJECTS --------------- //

        // adding a mountain
        this.addMountains()

        // keeping track of added platforms
        this.addedPlatforms = 0;

        // number of consecutive jumps made by the player so far
        this.playerJumps = 0;

        // adding a platform to the game, the arguments are platform width, x position and y position
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        // adding the player;
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, "player");

        // set gravity for player
        this.player.setGravityY(gameOptions.playerGravity);

        // makes it so player is at the foreground
        this.player.setDepth(2);

        // the player is not dying
        this.dying = false;

        // --------------- COLLISIONS --------------- //

        // setting collisions between the player and the platform group
        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function () {

            // play "run" animation if the player is on a platform
            if (!this.player.anims.isPlaying) {
                this.player.anims.play("run");
            }
        }, null, this);

        // setting collisions between the player and the coin group
        this.physics.add.overlap(this.player, this.coinGroup, function (player, coin) {

            // makes score go up when collision with coin happens
            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function () {
                    this.coinGroup.killAndHide(coin);
                    playerScore += 10;
                    scoreText.text = 'Score: ' + playerScore;
                    this.coinGroup.remove(coin);
                }
            });

        }, null, this);

        // checking for input
        this.input.on("pointerdown", this.jump, this);
    }

    // --------------- SETTING UP MOUNTAINS & PLATFORMS TO INTERACT & AUTO-POPULATE --------------- //

    // adding mountains
    addMountains() {
        let rightmostMountain = this.getRightmostMountain();
        if (rightmostMountain < game.config.width * 2) {
            let mountain = this.physics.add.sprite(rightmostMountain + Phaser.Math.Between(100, 350), game.config.height + Phaser.Math.Between(0, 100), "mountain");
            mountain.setOrigin(0.5, 1);
            mountain.body.setVelocityX(gameOptions.mountainSpeed * -1)
            this.mountainGroup.add(mountain);
            if (Phaser.Math.Between(0, 1)) {
                mountain.setDepth(1);
            }
            mountain.setFrame(Phaser.Math.Between(0, 3))
            this.addMountains()
        }
    }

    // getting rightmost mountain x position
    getRightmostMountain() {
        let rightmostMountain = -200;
        this.mountainGroup.getChildren().forEach(function (mountain) {
            rightmostMountain = Math.max(rightmostMountain, mountain.x);
        })
        return rightmostMountain;
    }

    // the core of the script: platform are added from the pool or created on the fly
    addPlatform(platformWidth, posX, posY) {

        // makes platforms infinite
        this.addedPlatforms++;

        // initialize platform
        let platform;

        // if from the pool
        if (this.platformPool.getLength()) {
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            let newRatio = platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        // else add new objects
        else {
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) * -1);
            platform.setDepth(2);
            this.platformGroup.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);

        // if this is not the starting platform...
        if (this.addedPlatforms > 1) {

            // is there a coin over the platform?
            if (Phaser.Math.Between(1, 100) <= gameOptions.coinPercent) {
                if (this.coinPool.getLength()) {
                    let coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else {
                    let coin = this.physics.add.sprite(posX, posY - 96, "coin");
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play("rotate");
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                }
            }
        }
    }

    // --------------- PLAYER JUMP CONFIGURATION --------------- //
    // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
    // and obviously if the player is not dying
    jump() {
        if ((!this.dying) && (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))) {
            if (this.player.body.touching.down) {
                this.playerJumps = 0;
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps++;

            // stops animation
            this.player.anims.stop();
        }
    }

    // ================================================ LIVE UPDATE SECTION ================================================ //

    update() {

        // keeps player from getting lost as the map scrolls by - without it the player would'nt be able to run as fast as the scroll
        this.player.x = gameOptions.playerStartPosition;

        // --------------- RECYCLING --------------- //

        // recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function (platform) {
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if (platformDistance < minDistance) {
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if (platform.x < - platform.displayWidth / 2) {
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // recycling coins
        this.coinGroup.getChildren().forEach(function (coin) {
            if (coin.x < - coin.displayWidth / 2) {
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        // recycling mountains
        this.mountainGroup.getChildren().forEach(function (mountain) {
            if (mountain.x < - mountain.displayWidth) {
                let rightmostMountain = this.getRightmostMountain();
                mountain.x = rightmostMountain + Phaser.Math.Between(100, 350);
                mountain.y = game.config.height + Phaser.Math.Between(0, 100);
                mountain.setFrame(Phaser.Math.Between(0, 3))
                if (Phaser.Math.Between(0, 1)) {
                    mountain.setDepth(1);
                }
            }
        }, this);

        // adding new platforms
        if (minDistance > this.nextPlatformDistance) {
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            let platformRandomHeight = gameOptions.platformHeighScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }

        // --------------- GAME OVER --------------- //

        // if player falls below the platform
        if (this.player.y > game.config.height) {

            // pause physics
            this.physics.pause();

            // stop time
            clearInterval(interval);

            // stop score
            clearInterval(scoreInterval);

            // show modal
            $(document).ready(function () {
                $("#score").html(playerScore)
                $('#exampleModal').modal("show");
            });
        }
    }
};

// --------------- DYNAMIC FRAME RESIZING --------------- //

function resize() {
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}





