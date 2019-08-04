import { BookList, BookInfo, Shelf } from './types'

export class Statistics {

    protected bookLists: BookList[]

    constructor(
        bookLists: BookList[]
    ) {
        this.bookLists = bookLists
    }

    public booksAndPagesPerList() {

        console.log(`-- pages count per shelf -- \n`)

        for (let i = 0; i < this.bookLists.length; i++) {

            let booksAmount: number = this.bookLists[i].books.length
            let pagesAmount: number = this.pagesAmountForList(this.bookLists[i])

            console.log(`Shelf: ${this.bookLists[i].listName}`)
            console.log(`Books: ${booksAmount}`)
            console.log(`Pages: ${pagesAmount}\n`)
        }

    }

    protected pagesAmountForList(bookList: BookList): number {

        let pageCount: number = 0

        for (let i = 0; i < bookList.books.length; i++) {
            if (bookList.books[i].pages)
                pageCount += bookList.books[i].pages
        }

        return pageCount
    }

}