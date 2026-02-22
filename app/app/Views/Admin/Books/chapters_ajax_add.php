<form action="<?=base_url('admin/books/chapters_add')?>" enctype="multipart/form-data" method="post" autocomplete="off">
    <div class="row">
            
        
        <div class="col-lg-6 p-2">
            <div>
                <label for="title" class="form-label">Chapter <span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="chapter" name="chapter" required>
                <input type="hidden"  id="book_id" name="book_id" value="<?= $book_id ?>" required>
            </div>
        </div>
        <div class="col-lg-6 p-2">
            <div>
                <label for="title" class="form-label">Description <span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="description" name="description" required>
            </div>
        </div>
        
        <!-- Submit Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

<script>
    $(document).ready(function () {
        $('#member-image-input').change(function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#user-profile-img').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Initialize the first editor
        ClassicEditor
        .create(document.querySelector('#editor'))
        .then(editor => {
            console.log(editor);
        })
        .catch(error => {
            console.error(error);
        });
    });
</script>