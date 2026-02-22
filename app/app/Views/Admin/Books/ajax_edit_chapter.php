<?php if (isset($edit_data)) : ?>
    <form action="<?= base_url('admin/books/edit_chapter/' . $edit_data['book_id']) ?>" method="post" enctype="multipart/form-data">
        <div class="row">
            <div class="col-lg-6 p-2">
                <label for="name" class="form-label">Book Title <span class="required text-danger">*</span></label>
                <input type="text" class="form-control textOnly" id="name" name="title" value="<?= $edit_data['title'] ?>" required>
            </div>
            <!-- Book Author -->
            <div class="col-lg-6 p-2">
                <div>
                    <label for="title" class="form-label">Author <span class="required text-danger">*</span></label>
                    <input type="text" class="form-control" id="author" name="author" value="<?= $edit_data['author']?>" required>
                </div>
            </div>
            <div class="col-lg-6 p-2">
                <label for="name" class="form-label">Description <span class="required text-danger">*</span></label>
                <input type="text" class="form-control textOnly" id="name" name="description" value="<?= $edit_data['description'] ?>" required>
            </div>
            <div class="col-lg-6 p-2">
                <div>
                    <label for="status" class="form-label">Status <span class="required text-danger">*</span></label>
                    <select class="form-control w-50 d-block" id="statuss" name="status" required>
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                    </select>
                </div>
            </div>
            <div class="col-lg-6 p-2">
                <label for="cover_image" class="form-label">Book Cover Image</label>
                <input type="file" class="form-control" id="cover_image" name="cover_image" accept="image/*">
            </div>
            
            <div class="col-12 p-2">
                <button class="btn btn-success float-end btn-save" type="submit">
                    <i class="ri-check-fill"></i> Save
                </button>
            </div>
        </div>
    </form>
<?php endif; ?>

<script>
    $('.textOnly').keypress(function(e) {
        var charCode = (e.which) ? e.which : event.keyCode;
        if (!(/[a-zA-Z\s]/.test(String.fromCharCode(charCode)))) {
            return false;
        }
    });
</script>
