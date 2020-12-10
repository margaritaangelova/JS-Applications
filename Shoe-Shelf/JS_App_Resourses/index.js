const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function () {
    this.use('Handlebars', 'hbs');

    //Home router
    this.get('/home', function (context) {
        DB.collection('offers')
            .get()
            .then((response) => {
                context.offers = response.docs.map((offer) => { return { id: offer.id, ...offer.data() } });
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/home.hbs');
                    });
            })
            .catch(errorHandler);

    });

    //User routes
    this.get('/register', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            });

    });

    this.get('/login', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            });
    });

    this.get('/logout', function (context) {

        UserModel.signOut()
            .then(response => {
                clearUserData();
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });


    this.post('/register', function (context) {
        const { email, password, rePassword } = context.params;

        if (password !== rePassword) {
            return;
        }

        UserModel.createUserWithEmailAndPassword(email, password)
            .then((userData) => {
                console.log(userData);
                this.redirect('#/login');

            }).catch(errorHandler);
    });

    this.post('/login', function (context) {
        const { email, password } = context.params;

        UserModel.signInWithEmailAndPassword(email, password)
            .then((userData) => {
                saveUserData(userData);
                this.redirect('#/home');

            }).catch(errorHandler);
    });

    //Offers routes
    this.get('/create-offer', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/createOffer.hbs');
            })
    });

    this.get('/edit-offer/:id', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/editOffer.hbs');
            })
    });

    this.post('/create-offer', function (context) {
        const { productName, price, imageUrl, description, brand } = context.params;

        DB.collection('offers').add({
            productName,
            price,
            imageUrl,
            description,
            brand,
            salesman: getUserData().uid,
            clients: [],
        })
            .then(createdProduct => {
                console.log(createdProduct);
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });

    //: означава динамична част, която не знаем все още
    this.get('/details/:offerId', function (context) {
        const { offerId } = context.params;
        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                const { uid } = getUserData();

                const actualOfferData = response.data();
                const imTheSalesMan = actualOfferData.salesman === uid;

                const userIndex = actualOfferData.clients.indexOf(uid);
                
                // console.log(userIndex);
                const clientsList = userIndex > -1;

                context.offer = { ...actualOfferData, imTheSalesMan, id: offerId, clientsList };
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    })
            })
            

    });

    // this.get('/details/:offerId', function (context) {
    //     const { offerId } = context.params;

    //     DB.collection('offers')
    //         .doc(offerId)
    //         .get()
    //         .then((response) => {
    //             const actualOfferData = response.data();
    //             const imTheSalesMan = actualOfferData.salesman === getUserData().uid;

    //             context.offer = { ...actualOfferData, imTheSalesMan, id: offerId };
    //             extendContext(context)
    //                 .then(function () {
    //                     this.partial('./templates/details.hbs');
    //                 })
    //         })

    // });

    this.get('/delete/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .delete()
            .then(() => {
                this.redirect('#/home');
            })
            .catch(errorHandler);
    });

    this.get('/edit/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                context.offer = { id: offerId, ...response.data() };

                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editOffer.hbs');
                    });
            });
    });

    this.post('/edit/:offerId', function (context) {
        const { offerId, productName, price, imageUrl, description, brand } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                return DB.collection('offers')
                    .doc(offerId)
                    .set({
                        ...response.data(),
                        productName,
                        price,
                        description,
                        brand,
                        imageUrl,

                    })
            })
            .then((response) => {
                this.redirect(`#/details/${offerId}`);
            })
            .catch(errorHandler);

    });

    this.get('/buy/:offerId', function (context) {
        const { offerId } = context.params;
        const { uid } = getUserData();
    
        DB.collection('offers')
            .doc(offerId)
            .get()
            .then((response) => {
                const offerData = {...response.data()};
                offerData.clients.push(uid)
                return DB.collection('offers')
                    .doc(offerId)
                    .set(offerData)
            })
            .then(() => {
                this.redirect(`#/details/${offerId}`);
            })
            .catch(errorHandler);

    });

});

(() => {
    app.run('/home');
})();

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