import firebase_admin
from firebase_admin import firestore
from flask import Flask, jsonify, redirect, render_template, request, url_for
from random import randrange

app = Flask(__name__)

firebase_admin.initialize_app()

db = firestore.client()

BIOS = db.collection(u'bios')

@app.route('/bios/')
def random_bio():
    bio = get_random_bio()  
    return render_template('bio.html', bio=bio)

@app.route('/bios/<id>')
def get_bio(id):
    bio = bio_or_404(id)
    return render_template('bio.html', bio=bio)


@app.route('/bios/<id>/json')
def get_bio_json(id):
    return jsonify(bio_or_404(id))

@app.route('/bios/<id>/upvote', methods=['POST'])
def upvote_bio(id):
    bio = bio_ref_or_404(id)
    old_val = bio.get().to_dict()['upvotes']
    bio.update({
        'upvotes' : old_val + 1,
    })
    return redirect(url_for('get_bio', id=id))

@app.route('/bios/<id>/downvote', methods=['POST'])
def downvote_bio(id):
    bio = bio_ref_or_404(id)
    old_val = bio.get().to_dict()['downvotes']
    bio.update({
        'downvotes' : old_val + 1,
    })
    return redirect(url_for('get_bio', id=id))

def bio_ref_or_404(id):
    doc_ref = BIOS.document(id)
    if not doc_ref:
        abort(404)
    return doc_ref

def bio_or_404(id):
    doc_ref = BIOS.document(id)
    doc = doc_ref.get()
    if not doc:
        abort(404)
    return ref_to_dict(doc)

def ref_to_dict(ref):
    ref_dict = ref.to_dict()
    ref_dict['id'] = ref.id
    return ref_dict

def get_random_bio():
    random_id = get_random_id()
    random_ref = BIOS.where('random', '<=', random_id)\
                     .limit(1)

    try:
        response = next(random_ref.stream())
    except (StopIteration):
        random_ref = BIOS.where('random', '>=', random_id)\
                         .limit(1)
        response = next(random_ref.stream())
    return ref_to_dict(response)


def get_random_id():
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    random_id = ''
    for i in range(20):
       random_id += chars[randrange(len(chars))] 
    return random_id
