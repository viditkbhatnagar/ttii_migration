<!--THIS IS A AJAX VIEW WHICH CAN BE USED FOR BOTH ADD AND UPDATE-->
<!--IF IS_SET VALUE IS TRUE [FROM CONTROLLER AJAX_RENAME], REDIRECT TO RENAME CONTROLLER-->

<div class="container">
    <div class="row">
        <div class="col-md-6">

            <?php if (isset($is_edit) && !empty($folder)): ?>
                <!-- RENAME FORM -->
                <form action="<?= base_url('admin/resources/rename_folder/' . $folder['id']) ?>" method="post">

                    <div class="mb-3">
                        <label for="name" class="form-label">Rename Folder <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="name" name="name" value="<?= esc($folder['name']) ?>" required>
                    </div>

                    <div class="mb-3">
                        <button type="submit" class="btn btn-primary">Rename</button>
                    </div>
                </form>

            <?php else: ?>
                <!-- ADD FOLDER FORM -->
                <form action="<?= base_url('admin/resources/add_folder') ?>" method="post">
                    <input type="hidden" name="parent_id" value="<?= esc($parent_id ?? 0) ?>">

                    <div class="mb-3">
                        <label for="name" class="form-label">New Folder Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="name" name="name" required>
                    </div>

                    <div class="mb-3">
                        <button type="submit" class="btn btn-success">Add Folder</button>
                    </div>
                </form>
            <?php endif; ?>

        </div>
    </div>
</div>



<!--<script>-->
<!--    $(document).ready(function () {-->
<!--        $('#member-image-input').change(function () {-->
<!--            const file = this.files[0];-->
<!--            if (file) {-->
<!--                const reader = new FileReader();-->
<!--                reader.onload = function (e) {-->
<!--                    $('#user-profile-img').attr('src', e.target.result);-->
<!--                };-->
<!--                reader.readAsDataURL(file);-->
<!--            }-->
<!--        });-->
        
<!--        // Initialize the first editor-->
<!--        ClassicEditor-->
<!--        .create(document.querySelector('#editor'))-->
<!--        .then(editor => {-->
<!--            console.log(editor);-->
<!--        })-->
<!--        .catch(error => {-->
<!--            console.error(error);-->
<!--        });-->
<!--    });-->
<!--</script>-->
