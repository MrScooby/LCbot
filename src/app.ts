import { HtmlReader } from './htmlReader'
import { Statistics } from './statistics'

const profilURL = 'http://lubimyczytac.pl/profil/207283/scooby'
// const profilURL = 'http://lubimyczytac.pl/profil/52192/mlecznik'
// const profilURL = 'http://lubimyczytac.pl/profil/651383/bartolomeo13'

let htmlReader = new HtmlReader()

// htmlReader.getBookList2(profilURL)

htmlReader.getBookList(profilURL)
    .done(bookLists => {
        let statistics = new Statistics(bookLists)
        statistics.booksAndPagesPerList()
    })
