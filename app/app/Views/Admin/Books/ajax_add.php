<form action="<?=base_url('admin/books/add')?>" enctype="multipart/form-data" method="post" autocomplete="off">
    <div class="row">
            
        <!-- Book Title -->
        <div class="col-lg-6 p-2">
            <div>
                <label for="title" class="form-label">Title <span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
            </div>
        </div>
        <!-- Book Author -->
        <div class="col-lg-6 p-2">
            <div>
                <label for="title" class="form-label">Author <span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="author" name="author" required>
            </div>
        </div>
       
       <!-- Book Description -->
        <div class="col-lg-12 p-2">
            <div>
                <label for="description" class="form-label">Description <span class="required text-danger">*</span></label>
                <textarea class="form-control" id="description" name="description" required></textarea>
            </div>
        </div>
        
        <!-- Book Status -->
        <div class="col-lg-6 p-2">
            <div>
                <label for="status" class="form-label">Status <span class="required text-danger">*</span></label>
                <select class="form-control w-50"" id="statuss" name="status" required>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                </select>
            </div>
        </div>
        <div class="col-lg-6 p-2">
            <label for="cover_image" class="form-label">Book Cover Image</label>
            <input type="file" class="form-control" id="cover_image" name="cover_image" accept="image/*" required>
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
