
const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home router
    this.get('#/home', function (context) {
        DB.collection('films')
            .get()
            .then((response) => {
                context.films = response.docs.map((film) => { return { id: film.id, ...film.data() } });
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/home.hbs');
                    });
            })
            .catch(handleError);
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
                showNotification({ message:'Logged out successfully' });
            })
            .catch(handleError);
    });

    this.post('#/register', function (context) {
        const { email, password, repeatPassword } = context.params;

        if (email === '' || password === '' || repeatPassword === '') {
            handleError({ message: 'Fields can not be empty!' });
            return;
        }

        if (password !== repeatPassword) {
            handleError({ message: 'Passwords should match!' });
            return;
        }

        if (password.length < 6) {
            handleError({ message: 'Password should be min 6 characters!' });
            return;
        }
    

        UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                console.log(userData);
                this.redirect('#/login');

            }).catch(handleError);
    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        if (email === '' || password === '') {
            handleError({ message: 'Fields can not be empty!' });
            return;
        }

        UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                this.redirect('#/home');

            }).catch(handleError);
    });

    this.get('#/add-movie', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/addMovie.hbs');
            })

    });

    this.post('#/add-movie', function (context) {
        const { title, description, imageUrl } = context.params;

        if (title === '' || description === '' || imageUrl === ''){
            handleError({ message: 'Fields can not be empty!' });
            return;
        }

        DB.collection('films').add({
            title,
            description,
            imageUrl,
            creator: getUserData().uid,
            peopleWhoLiked: [],
            numberOfLikes: 0,
        })
            .then(createdProduct => {
                this.redirect('#/home');
                showNotification({ message:'Movie created successfully' });
            })
            .catch(handleError);
    });

    this.get('/details/:filmId', function (context) {
        const { filmId } = context.params;
        DB.collection('films')
            .doc(filmId)
            .get()
            .then((response) => {
                const { uid } = getUserData();

                const actualFilmData = response.data();
                const imTheCreator = actualFilmData.creator === uid;

                const userIndex = actualFilmData.peopleWhoLiked.indexOf(uid);
                const likedList = userIndex > -1;
                
                context.film = { ...actualFilmData, imTheCreator, id: filmId, likedList};
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    })
            })
            

    });

    this.get('/delete/:filmId', function (context) {
        const { filmId } = context.params;

        DB.collection('films')
            .doc(filmId)
            .delete()
            .then(() => {
                this.redirect('#/home');
                showNotification({ message:'Movie deleted successfully' });
            })
            .catch(handleError);
    });

    this.get('/edit/:filmId', function (context) {
        const { filmId } = context.params;

        DB.collection('films')
            .doc(filmId)
            .get()
            .then((response) => {
                context.film = { id: filmId, ...response.data() };

                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editMovie.hbs');
                    });
            });
    });

    this.post('/edit/:filmId', function (context) {
        const { filmId, title, description, imageUrl } = context.params;

        DB.collection('films')
            .doc(filmId)
            .get()
            .then((response) => {
                return DB.collection('films')
                    .doc(filmId)
                    .set({
                        ...response.data(),
                        title, 
                        description, 
                        imageUrl
                    })
            })
            .then((response) => {
                this.redirect(`#/details/${filmId}`);
                showNotification({ message:'Movie edited successfully' });
            })
            .catch(handleError);

    });

    this.get('#/edit-movie', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/editMovie.hbs');
            })

    });

    this.get('/like/:filmId', function (context) {
        const { filmId } = context.params;
        const { uid } = getUserData();

        DB.collection('films')
            .doc(filmId)
            .get()
            .then((response) => {
                const filmData = {...response.data()};
                filmData.peopleWhoLiked.push(uid);
                filmData.numberOfLikes++;

                return DB.collection('films')
                    .doc(filmId)
                    .set(filmData)
            })
            .then(() => {
                this.redirect(`#/details/${filmId}`);
            })
            .catch(handleError);

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

function showNotification({ message }) {
    const infoContainer = document.getElementById('info');
    infoContainer.style.display = 'block';
    infoContainer.textContent = message;
    setTimeout(() => {
        infoContainer.textContent = '';
        infoContainer.style.display = 'none';
    }, 5000);
}

function handleError({ message }) {
    const errorContainer = document.getElementById('errors');
    errorContainer.style.display = 'block';
    errorContainer.textContent = message;
    setTimeout(() => {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
    }, 5000);
}

