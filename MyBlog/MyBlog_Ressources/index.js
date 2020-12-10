const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home router
    this.get('#/home', function (context) {
        DB.collection('posts')
        .get()
        .then((response) => {
            const user = getUserData();
            context.post = response.docs.map((post) => { 
                // console.log(post.data().creator);
                // console.log(user.uid);
                if(user){
                    return { 
                        id: post.id, 
                        ...post.data(),
                        imTheCreator: post.data().creator === user.uid
                    }
                }
                // console.log(imTheCreator);
               
            });
            // console.log(context.posts);
            // console.log(user);
            extendContext(context)
                .then(function () {
                    this.partial('./templates/home.hbs');
                });
        })
        .catch(errorHandler);


    });

    this.get('#/register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            })

    });

    this.get('#/login', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            })

    });

    this.get('#/logout', function (context) {

        UserModel.signOut()
            .then(response => {
                clearUserData();
                this.redirect('#/home');
            })
            .catch(errorHandler);
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
                
                this.redirect('#/login');

            }).catch(errorHandler);
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

    //create post
    this.post('#/create-post', function (context) {
        const { title, category, content } = context.params;

        if (title === '' || category === '' || content === ''){
            return;
        }

        DB.collection('posts').add({
            title,
            category,
            content,
            creator: getUserData().uid,
        })
            .then(createdProduct => {
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });

    this.get('/details/:postId', function (context) {
        const { postId } = context.params;
        DB.collection('posts')
            .doc(postId)
            .get()
            .then((response) => {
                context.post = { ...response.data(), id: postId};
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    })
            })
            

    });

    this.get('/edit/:postId', function (context) {
        const { postId } = context.params;

        DB.collection('posts')
            .doc(postId)
            .get()
            .then((response) => {
                context.post = { id: postId, ...response.data() };

                extendContext(context)
                    .then(function () {
                        this.partial('./templates/edit.hbs');
                    });
            });
    });

    this.post('/edit/:postId', function (context) {
        const { postId, title, category, content } = context.params;

        DB.collection('posts')
            .doc(postId)
            .get()
            .then((response) => {
                return DB.collection('posts')
                    .doc(postId)
                    .set({
                        ...response.data(),
                        title, 
                        category, 
                        content
                    })
            })
            .then((response) => {
                this.redirect(`#/home`);
            })
            .catch(errorHandler);

    });

    this.get('/delete/:postId', function (context) {
        const { postId } = context.params;

        DB.collection('posts')
            .doc(postId)
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

function extendContext(context) {

    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.userEmail = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
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
