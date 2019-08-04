export type BookList = {
    listName: string,
    books: BookInfo[]
}

export type BookInfo = {
    title?: string,
    author?: string,
    pages?: number,
    genre?: string,
    LCid?: string
}

export type Shelf = {
    shelfName: string,
    shelfURL: string
}

// export type AllBooks = BookInfo[]