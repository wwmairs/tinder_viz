import firebase_admin
from firebase_admin import db
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

firebase_admin.initialize_app(options={
    'databaseURL': 'https://swipe-logic.firebaseio.com'
})

BIOS = db.reference('bios')

@app.route('/bios', methods=['POST'])
def add_bio():
    req = request.json
    bio = BIOS.push(req)
    return jsonify({'id': bio.key}), 201

@app.route('/bios/<id>')
def get_bio(id):
    bio = bio_or_404(id)
    key = bio.key
    return render_template('bio.html', bio=bio.get(), key=key)


@app.route('/bios/<id>/json')
def get_bio_json(id):
    return jsonify(bio_or_404(id).get())

@app.route('/bios/<id>/upvote', methods=['POST'])
def upvote_bio(id):
    bio = bio_or_404(id)
    bio.update({
        'upvotes' : bio.get()['upvotes'] + 1,
    })
    return get_bio(id)

@app.route('/bios/<id>/downvote', methods=['POST'])
def downvote_bio(id):
    bio = bio_or_404(id)
    bio.update({
        'downvotes' : bio.get()['downvotes'] + 1,
    })
    return get_bio(id)

def bio_or_404(id):
    bio = BIOS.child(id)
    if not bio:
        abort(404)
    return bio
