import * as express from 'express';

export class Server {

    protected app;

    constructor() {
        const port = process.env.PORT || 3000;

        this.app = express();
        this.app.set('Content-Type', 'text/html');
        this.app.listen(port, () => {
            console.log(`Single page app listening on port ${port}!`);
        });

    }

    public loadOutcomeToPage() {
        this.app.get('/', (req, res) => {
            res.send();
        });
    }

}