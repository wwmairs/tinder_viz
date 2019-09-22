import firebase_admin
from firebase_admin import db
import flask

app = flask.Flask(__name__)

firebase_admin.initialize_app(options={
    'databaseURL': 'https://swipe-logic.firebaseio.com'
})

BIOS = db.reference('bios')

@app.route('/bios', methods=['POST'])
def add_bio():
    req = flask.request.json
    bio = BIOS.push(req)
    return flask.jsonify({'id': bio.key}), 201

@app.route('/bios/<id>')
def view_bio(id):
    return flask.jsonify(bio_or_404(id))

def bio_or_404(id):
    bio = BIOS.child(id).get()
    if not bio:
        flask.abort(404)
    return bio
