const TEMP_FIELDS = {
    'temperature': 'tempF',
    'local_temperature': 'localtempF',
};

export default class TemperatureToFahrenheit {
    constructor(zigbee, mqtt, state, publishEntityState, eventBus, enableDisableExtension,
                restartCallback, addExtension, settings, logger) {
        this.mqtt = mqtt;
        this.eventBus = eventBus;
        this.settings = settings;
        this.logger = logger;
        this.isRepublishing = false;
    }

    start() {
        this.logger.info('[TemperatureToFahrenheit] Extension loaded — adding temp_f field');

        this.eventBus.onMQTTMessagePublished(this, (data) => {
            if (this.isRepublishing) return;

            const baseTopic = this.settings.get().mqtt.base_topic;
            if (!data.topic.startsWith(`${baseTopic}/`)) return;
            if (data.topic.includes('/bridge/')) return;

            let payload;
            try {
                payload = JSON.parse(data.payload);
            } catch {
                return;
            }

            let converted = false;
            for (const [field, fieldF] of Object.entries(TEMP_FIELDS)) {
                if (typeof payload[field] === 'number') {
                    payload[fieldF] = parseFloat(((payload[field] * 9) / 5 + 32).toFixed(2));
                    converted = true;
                }
            }

            if (!converted) return;

            const topic = data.topic.substring(baseTopic.length + 1);
            this.logger.info(`[TemperatureToFahrenheit] Republishing ${topic} with temp_f`);
            this.isRepublishing = true;
            this.mqtt.publish(topic, JSON.stringify(payload), data.options);
            this.isRepublishing = false;
        });
    }

    stop() {
        this.eventBus.removeListeners(this);
    }
}
