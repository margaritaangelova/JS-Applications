const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home router
    this.get('#/home', function (context) {
        renderCategories(context);
    });

    this.get('#/register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            })

    });

    this.post('#/register', function (context) {
        const { email, password, repeatPassword } = context.params;

        if (email === '' || password === '' || repeatPassword === '') {

            return;
        }

        if (password !== repeatPassword) {

            return;
        }

        if (password.length < 6) {

            return;
        }


        UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                this.redirect('#/login');

            }).catch(errorHandler);
    });


    this.get('#/login', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            })

    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        if (email === '' || password === '') {
            return;
        }

        UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                this.redirect('#/home');

            }).catch(errorHandler);
    });

    this.get('#/logout', function (context) {

        UserModel.signOut()
            .then(() => {
                clearUserData();
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });


    this.get('#/create-article', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/createArticle.hbs');
            })

    });

    this.post('#/create-article', function (context) {
        const { title, category, content } = context.params;
        const creator = getUserData().uid;

        if (title === '' || category === '' || content === '') {
            return;
        }

        DB.collection('articles').add({
            title,
            category,
            content,
            creator: creator,
        })
            .then(createdProduct => {
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });

    // this.get('#/edit-article', function (context) {
    //     extendContext(context)
    //         .then(function () {
    //             this.partial('./templates/editArticle.hbs');
    //         })

    // });

    this.get('/edit/:articleId', function (context) {
        const { articleId } = context.params;

        DB.collection('articles')
            .doc(articleId)
            .get()
            .then((response) => {
                context.article = { id: articleId, ...response.data() };

                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editArticle.hbs');
                    });
            });
    });

    this.get('/details/:articleId', function (context) {
        const { articleId } = context.params;

        DB.collection('articles')
            .doc(articleId)
            .get()
            .then((response) => {
                const { uid } = getUserData();

                const actualArticleData = response.data();
                const imTheCreator = actualArticleData.creator === uid;
                
                context.article = { ...response.data(), imTheCreator, id: articleId};
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    })
            })
            

    });

    this.post('/edit/:articleId', function (context) {
        const { articleId, title, category, content } = context.params;

        DB.collection('articles')
            .doc(articleId)
            .get()
            .then((response) => {
                return DB.collection('articles')
                    .doc(articleId)
                    .set({
                        ...response.data(),
                        title,
                        category,
                        content
                    })
            })
            .then((response) => {
                this.redirect(`#/details/${articleId}`);
            })
            .catch(errorHandler);

    });

    this.get('/delete/:articleId', function (context) {
        const { articleId } = context.params;

        DB.collection('articles')
            .doc(articleId)
            .delete()
            .then(() => {
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });


});

(() => {
    app.run('#/home');
})();


// function onMovieLike(e, movieId){
//     e.preventDefault();
// }

function extendContext(context) {

    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.userEmail = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs',
    });
}

function errorHandler(error) {
    console.log(error);
}

//Трите функции, с които манипулираме session storage:

function saveUserData(data) {
    const { user: { email, uid } } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }));
}

//обратната функция на saveUserData:
function getUserData() {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user) : null;
}

function clearUserData() {
    this.localStorage.removeItem('user');
}

function renderCategories(context) {

    DB.collection('articles')
        .where("category", "==", "JavaScript")
        .get()
        .then((response) => {
            context.js = response.docs.map((js) => {
                return {
                    id: js.id,
                    ...js.data(),
                }
            });
            extendContext(context)
                .then(function () {
                    this.partial('./templates/home.hbs');
                })
        })
        .catch(errorHandler);


    DB.collection('articles')
        .where("category", "==", "C#")
        .get()
        .then((response) => {
            context.csharp = response.docs.map((csharp) => {
                return {
                    id: csharp.id,
                    ...csharp.data(),
                }
            });
            extendContext(context)
                .then(function () {
                    this.partial('./templates/home.hbs');
                })
        })
        .catch(errorHandler);

    DB.collection('articles')
        .where("category", "==", "Java")
        .get()
        .then((response) => {
            context.java = response.docs.map((java) => {
                return {
                    id: java.id,
                    ...java.data(),
                }
            });
            extendContext(context)
                .then(function () {
                    this.partial('./templates/home.hbs');
                })
        })
        .catch(errorHandler);

    DB.collection('articles')
        .where("category", "==", "Python")
        .get()
        .then((response) => {
            context.python = response.docs.map((python) => {
                return {
                    id: python.id,
                    ...python.data(),
                }
            });
            extendContext(context)
                .then(function () {
                    this.partial('./templates/home.hbs');
                })
        })
        .catch(errorHandler);

}