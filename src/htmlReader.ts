import * as request from 'request'
import * as cheerio from 'cheerio'
import * as Promise_ from 'promise'
import { BookList, BookInfo, Shelf } from './types'

export class HtmlReader {

    protected openRequests: number

    constructor() { }

    public async getBookList(profilePageURL: string): Promise_<BookList[]> {
        let bookList: BookList[] = []
        let allCurrentBooks: BookInfo[] = []
        profilePageURL += '/biblioteczka/miniatury'
        let profilePageHTML = await this.readPageHtml(profilePageURL)
        console.log(`Profile page request done.`)
        let shelfList: Shelf[] = this.reedShelfList(profilePageHTML)

        for (let i = 0; i < shelfList.length; i++) {
            let shelfPageHTML = await this.readPageHtml(shelfList[i].shelfURL)
            console.log(`Shelf page request done.`)
            bookList.push({
                listName: shelfList[i].shelfName,
                books: await this.reedAllBooksFromShelf(shelfPageHTML, shelfList[i].shelfURL, allCurrentBooks)
            })
            console.log(`Read all books from shelf: ${shelfList[i].shelfName}`)
            allCurrentBooks = allCurrentBooks.concat(bookList[i].books)
        }
        return new Promise_((resolve) => {
            resolve(bookList)
        })
    }

    protected reedShelfList(BODY): Shelf[] {
        let $ = cheerio.load(BODY)
        let shelfList: Shelf[] = []

        $('li.shelf').each((index, list) => {
            let shelfName = $(list).children('a').text()
            let shelfURL = $(list).children('a').attr('href')

            // if (shelfName == '2014' || shelfName == '2015' || shelfName == '2016' || shelfName == '2017' || shelfName == '2018' || shelfName == '2019')
            shelfList.push({
                shelfName: shelfName,
                shelfURL: shelfURL.slice(0, 4) === 'http' ? shelfURL : 'http://lubimyczytac.pl/' + shelfURL
            })
        })

        return shelfList
    }

    protected readPageHtml(pageURL: string): Promise_<string> {
        return new Promise_((resolve, reject) => {
            request(pageURL, (error, response, BODY) => {
                resolve(BODY)
            })
        })
    }

    protected async reedAllBooksFromShelf(shelfPageHTML: string, shelfURL: string, allCurrentBooks: BookInfo[]): Promise_<BookInfo[]> {
        let $ = cheerio.load(shelfPageHTML)
        let booksFromAllPages: BookInfo[] = []
        let shelfLastSubpageNumber = Number($('td.centered ul').children().last().children('a').text())
        let shelfSubpageAmmount = shelfLastSubpageNumber != 0 ? shelfLastSubpageNumber : 1

        for (let i = 1; i <= shelfSubpageAmmount; i++) {
            let shelfSubpageURL = shelfURL + `/${i}`

            let shelfSubpageHTML: string = await this.readPageHtml(shelfSubpageURL)
            console.log(`Shelf subpage request done.`)

            let booksFromPage: BookInfo[] = await this.readAllBooksFromPage(shelfSubpageHTML, allCurrentBooks)
            booksFromAllPages = booksFromAllPages.concat(booksFromPage)
        }

        return new Promise_((resolve) => {
            resolve(booksFromAllPages)
        })
    }

    protected bookIDRegeq = /(\/)[0-9]+(\/)/

    protected readAllBooksFromPage(shelfSubpageHTML: string, allCurrentBooks: BookInfo[]): Promise_<BookInfo[]> {
        let $: CheerioStatic = cheerio.load(shelfSubpageHTML)
        let booksPromises: Promise_<BookInfo>[] = []

        $('div.library-shelf').each((index, shelf) => {
            $(shelf).children('div').each((index, book) => {
                let bookLink = $(book).children('a').attr('href')
                if (bookLink) {

                    let bookID: string = this.bookIDRegeq.exec(bookLink)[0]
                    bookID = bookID.slice(1)
                    bookID = bookID.slice(0, bookID.length - 1)

                    let bookInfo: BookInfo = this.bookPageAlreadyRead(bookID, allCurrentBooks)
                    
                    if (!bookInfo) {
                        booksPromises.push(new Promise_((resolve, reject) => {
                            request(bookLink, (error, response, bookPageHTML) => {
                                let bookInfo = this.getBookInfo(bookPageHTML, bookID)
                                console.log(`Read info on book: ${bookInfo.title}`)
                                resolve(bookInfo)
                            })
                        }))
                    } else {
                        booksPromises.push(new Promise_((resolve, reject) => {
                            resolve(bookInfo)
                        }))
                    }
                }
            })
        })

        let allBooksFromPagePromise: Promise_<BookInfo[]> = new Promise_((resolve, reject) => {
            Promise_.all(booksPromises)
                .done(bookInfo => {
                    resolve(bookInfo)
                })
        })

        return allBooksFromPagePromise
    }

    protected bookPageAlreadyRead(bookID: string, allCurrentBooks: BookInfo[]): BookInfo {
        let matchingBook: BookInfo
        for (let bookInfo of allCurrentBooks) {
            if (bookInfo.LCid === bookID) {
                matchingBook = bookInfo
                break
            }
        }
        return matchingBook
    }

    protected getBookInfo(bookPageHTML: string, bookID: string): BookInfo {
        let $ = cheerio.load(bookPageHTML)
        let book: BookInfo

        book = {
            title: $('h1[itemprop = "name"]').text(),
            author: $('div.author-info-container').children('span').children('a').text(),
            pages: parseInt($('dt:contains("liczba stron")').next().text()),
            genre: $('a[itemprop = "genre"]').text(),
            LCid: bookID
        }
        return book
    }

}