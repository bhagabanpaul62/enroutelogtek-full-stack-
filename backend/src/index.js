import 'dotenv/config';
import { app } from './app.js';
import { db } from '#shared/db/index.js';
import { startLoadClock } from '#features/load/services/clock.service.js';
import { startDeliveryWorker } from '#features/notification/services/delivery.worker.js';
import { startFleetExpiryClock } from '#features/fleet/services/expiry.service.js';
import { startSubscriptionClock } from '#features/subscription/services/expiry.service.js';

const startServer = async () => {
    try {
        //check database
        await db.execute('SELECT 1');
        console.log('DataBase is Connected');

        //start the server
        app.listen(process.env.PORT, () => {
            console.log(`server is start in ${process.env.PORT}`);
            // Closes bidding windows and expires unanswered awards on time.
            startLoadClock();
            startFleetExpiryClock();
            startSubscriptionClock();
            // Sends queued notification emails and retries failures.
            startDeliveryWorker();
        });
    } catch (error) {
        console.log('fail to stat the server :', error);
        process.exit(1);
    }
};

startServer();
