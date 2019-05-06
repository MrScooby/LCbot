import * as request from 'request';
import * as cheerio from 'cheerio';
import * as Promise_ from 'promise';
import { BookList, BookInfo, Shelf } from './types';

export class HtmlReader {

    protected openRequests: number;

    constructor() {
        this.openRequests = 0;
    }

    public getBookList(profilePageURL: string): Promise_<BookList[]> {

        profilePageURL += '/biblioteczka/miniatury';

        let allShelfsPromise: Promise_<BookList[]> = new Promise_((resolve, reject) => {

            this.openRequests++
            request(profilePageURL, (error, response, BODY) => {
                this.openRequests--;
                console.log(`Profile page request done.`);
                let shelfList: Shelf[] = this.reedShelfList(BODY);
                let allShelfPromises: Promise_<BookList>[] = [];

                for (let i = 0; i < shelfList.length; i++) {
                    let shelfPromise: Promise_<BookList> = new Promise_((resolve, reject) => {
                        this.openRequests++;
                        request(shelfList[i].shelfURL, (error, response, BODY) => {
                            this.openRequests--;
                            console.log(`Shelf page request done. shelf: ${shelfList[i].shelfName}`);

                            this.reedAllBooksFromShelf(BODY, shelfList[i].shelfURL)
                                .done(allBooksFromShelf => {
                                    console.log(`Read all books from shelf: \t${shelfList[i].shelfName}`);

                                    let bookList: BookList = {
                                        listName: shelfList[i].shelfName,
                                        books: allBooksFromShelf
                                    }
                                    resolve(bookList);
                                });
                        });
                    });
                    allShelfPromises.push(shelfPromise);
                }

                Promise_.all(allShelfPromises)
                    .done(allShelfs => {
                        console.log(`\n=== All data read ===\n`);
                        resolve(allShelfs);
                    });
            });
        });

        return allShelfsPromise;
    }

    protected sleep(ms: number) {
        return new Promise_(resolve => {
            setTimeout(resolve, ms)
        })
    }

    protected reedShelfList(BODY): Shelf[] {
        let $ = cheerio.load(BODY);
        let shelfList: Shelf[] = [];

        $('li.shelf').each((index, list) => {
            let shelfName = $(list).children('a').text();
            let shelfURL = $(list).children('a').attr('href');

            // if (shelfName == '2014' || shelfName == '2015' || shelfName == '2016' || shelfName == '2017' || shelfName == '2018' || shelfName == '2019')
            shelfList.push({
                shelfName: shelfName,
                shelfURL: shelfURL.slice(0, 4) === 'http' ? shelfURL : 'http://lubimyczytac.pl/' + shelfURL
            });
        });

        return shelfList;
    }

    protected reedAllBooksFromShelf(BODY, shelfURL: string): Promise_<BookInfo[]> {
        let $ = cheerio.load(BODY);
        let booksFromPagePromises: Promise_<BookInfo[]>[] = [];

        let shelfLastSubpageNumber = Number($('td.centered ul').children().last().children('a').text());
        let shelfSubpageAmmount = shelfLastSubpageNumber != 0 ? shelfLastSubpageNumber : 1;

        for (let i = 1; i <= shelfSubpageAmmount; i++) {
            let shelfSubpageURL = shelfURL + `/${i}`;

            let booksFromPagePromise: Promise_<BookInfo[]> = new Promise_((resolve, reject) => {
                this.openRequests++;
                request(shelfSubpageURL, (error, response, BODY) => {
                    this.openRequests--;
                    console.log(`Shelf subpage request done.`);

                    this.getAllBooksFromPage(BODY)
                        .done(allBOoksFromPage => {
                            resolve(allBOoksFromPage);
                        });
                });
            });
            booksFromPagePromises.push(booksFromPagePromise);
        }

        let allBooksFromShelfPromise: Promise_<BookInfo[]> = new Promise_((resolve, reject) => {
            Promise_.all(booksFromPagePromises)
                .done(allBooksFromAllPages => {
                    let allBooksFromShelf: BookInfo[] = [];

                    for (let i = 0; i < allBooksFromAllPages.length; i++) {
                        allBooksFromShelf = allBooksFromShelf.concat(allBooksFromAllPages[i]);
                    }
                    resolve(allBooksFromShelf);
                });

        });
        return allBooksFromShelfPromise;
    }

    protected getAllBooksFromPage(BODY): Promise_<BookInfo[]> {
        let $: CheerioStatic = cheerio.load(BODY);
        let booksPromises: Promise_<BookInfo>[] = [];

        $('div.library-shelf').each((index, shelf) => {
            $(shelf).children('div').each((index, book) => {
                let bookLink = $(book).children('a').attr('href');
                if (bookLink) {
                    let bookPromise: Promise_<BookInfo> = new Promise_(async (resolve, reject) => {
                        this.openRequests++;
                        // while (this.openRequests > 20) {
                        //     await this.sleep(3000);
                        // }
                        request(bookLink, (error, response, BODY) => {
                            this.openRequests--;
                            // console.log(`Book page request done.`);
                            console.log(`Open requests:\t${this.openRequests}`);
                            resolve(this.getBookInfo(BODY));
                        });
                    });
                    booksPromises.push(bookPromise);
                }
            });
        });

        let allBooksFromPagePromise: Promise_<BookInfo[]> = new Promise_((resolve, reject) => {
            Promise_.all(booksPromises)
                .done(bookInfo => {
                    resolve(bookInfo);
                });
        });

        return allBooksFromPagePromise;
    }

    protected getBookInfo(BODY): BookInfo {
        let $ = cheerio.load(BODY);
        let book: BookInfo;

        book = {
            title: $('h1[itemprop = "name"]').text(),
            author: $('div.author-info-container').children('span').children('a').text(),
            pages: parseInt($('dt:contains("liczba stron")').next().text()),
            genre: $('a[itemprop = "genre"]').text(),
        }
        return book;
    }

}