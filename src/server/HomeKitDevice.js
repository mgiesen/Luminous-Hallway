const hap = require('hap-nodejs');
const { Accessory, Service, Characteristic, uuid } = hap;

class HomeKitDevice
{
    constructor(name, config, onSet, brightnessSet)
    {
        this.name = name;
        this.config = config;
        this.onSetCallback = onSet;
        this.brightnessSetCallback = brightnessSet;

        this.accessory = new Accessory(name, uuid.generate('hap-nodejs:accessories:' + name));
        this.lightService = this.accessory.addService(Service.Lightbulb, name);

        this.setupCharacteristics();
        this.publishAccessory();
    }

    setupCharacteristics()
    {
        this.lightService.getCharacteristic(Characteristic.On)
            .on('set', (value, callback) =>
            {
                this.onSetCallback(value);
                callback();
            });

        this.lightService.addCharacteristic(Characteristic.Brightness)
            .on('set', (value, callback) =>
            {
                this.brightnessSetCallback(value);
                callback();
            });
    }

    publishAccessory()
    {
        this.accessory.publish({
            username: this.config.username,
            pincode: this.config.pincode,
            port: this.config.port,
            category: Accessory.Categories.LIGHTBULB,
        });

        console.log(`HomeKit Accessory setup complete`);
    }
}

module.exports = HomeKitDevice;
