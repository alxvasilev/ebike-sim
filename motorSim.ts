function assert(cond: any) {
    if (!cond) {
        throw new Error("Assertion failed");
    }
}

class Ebike {
    motorWindingR!: number;
    motorKv!: number;
    motorKt!: number;

    battVoltage!: number;
    battR!: number;
    battMaxI!: number;
    systemR!: number;
    wheelRadius!: number;
    wheelRR!: number;
    wheelCircumf: number;
    cdA!: number;
    weight!: number;
    slope!: number;
    throttle: number = 0;
    targetThrottle: number = 0;
    curRpm: number = 0;
    curBattI: number = 0;
    curMotorI: number = 0;
    curTorque: number = 0;
    constructor(config: {
        motorWindingR: number,
        motorKv: number,
        battVoltage: number,
        battR: number;
        battMaxI: number;
        systemR: number;
        wheelRadius: number,
        wheelRR: number;
        cdA: number,
        weight: number,
        slope: number
    }) {
        Object.assign(this, config);
        this.motorKt = (60 / (2 * Math.PI * this.motorKv));
        this.wheelCircumf = 2 * Math.PI * this.wheelRadius;
    }
    tick(period: number) { // 1ms tick
        let force = this.curForce();
        let accel = force / this.weight;
        let newSpeed = this.curSpeed() + accel * period;
        this.curRpm = newSpeed * 60 / this.wheelCircumf;
        return newSpeed;
    }
    curSpeed() {
        return this.wheelCircumf * this.curRpm / 60;
    }
    dragForce() {
        let speed = this.curSpeed();
        let weightForce = this.weight * 9.8;
        let drag = (1.2 * (speed ** 2) * this.cdA) / 2; // air drag
        if (speed > 0.001) {
            // this.slope is the sine of the grade andle
            drag += 2 * (Math.sqrt(1 - this.slope**2) * weightForce * this.wheelRR); // rolling resistance of two wheels
        }
        drag += this.slope * weightForce; // slope
        return drag;
    }
    dragPower() {
        return this.dragForce() * this.curSpeed();
    }
    curForce() {
        let motorBackEmf = this.curRpm / this.motorKv;
        let totalR = this.systemR + this.motorWindingR;

        let motorI = (this.throttle*this.battVoltage - motorBackEmf) / (totalR + this.battR*(this.throttle**2));
        if (motorI < 0.0) {
            motorI = 0.0;
        }
        let battI = motorI * this.throttle;

        if ((battI > this.battMaxI) || (battI < this.battMaxI && this.throttle < this.targetThrottle)) {
            let throttle = -(Math.sqrt(motorBackEmf**2 + 4*this.battMaxI*totalR*(this.battVoltage-this.battMaxI*this.battR)) + motorBackEmf) / (2*this.battMaxI*this.battR - 2*this.battVoltage);
            this.setEffThrottle(throttle);

            motorI = (this.throttle*this.battVoltage - motorBackEmf) / (totalR + this.battR*(this.throttle**2));
            battI = motorI * this.throttle;
        }
        assert(battI <= this.battMaxI + 0.000001);
        this.curBattI = battI;
        this.curMotorI = motorI;
        this.curTorque = motorI * this.motorKt;
        return this.curTorque / this.wheelRadius - this.dragForce();
    }
    curEfficiency() {
        let mechP = this.curTorque * (this.curRpm / 60) * 2 * Math.PI;
        let elecP = this.curBattI * this.battVoltage;
        return mechP / elecP;
    }
    setThrottle(val: number) {
        this.targetThrottle = val;
        this.setEffThrottle(val);
    }
    protected setEffThrottle(val: number) {
        this.throttle = (val > this.targetThrottle) ? this.targetThrottle : val;
    }
}

function tenth(val: number) {
    let str = '' + Math.round(val * 10) / 10;
    let dec = val % 1;
    if (dec < 0.05 || dec >= 0.95) {
        str += '.0';
    }
    return (str.length < 4) ? (' ' + str) : str;
}

if (typeof window === "undefined") {
    let ebike = new Ebike({
        motorWindingR: 0.15,
        motorKv: 7.231,
        battVoltage: 60,
        battR: 0.143,
        battMaxI: 28,
        systemR: 0.1,
        wheelRadius: 0.368,
        wheelRR: 0.008,
        cdA: 0.6,
        weight: 110,
        slope: 0.0
    });
    ebike.setThrottle(0.6);
    setInterval(() => {
        let speed = ebike.tick(0.010);
        let mechP = ebike.curTorque * (ebike.curRpm / 60) * 2 * Math.PI;
        let elecP = ebike.curBattI * ebike.battVoltage;
        let kph = speed * 3600 / 1000;
        console.log(
            "kph:",  tenth(kph), "thr:", tenth(ebike.throttle*100),
            "Im:", tenth(ebike.curMotorI), "Ib:", tenth(ebike.curBattI),
            "Pe:", tenth(elecP), "Pm:", tenth(mechP), "wh/Km:", tenth(elecP / kph),
            "rpm:", tenth(ebike.curRpm), "torq:", tenth(ebike.curTorque),
            "eff:", tenth(mechP  * 100 / elecP), "dragP:", tenth(ebike.dragPower()));
    }, 10);
}