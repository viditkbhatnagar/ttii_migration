<form action="<?= base_url('app/consultant/add_university/'.$consultant_id) ?>" method="post" enctype="multipart/form-data" id="myForm">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="university" class="form-label">Assign Universities<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="university[]" multiple required>
                <option value="" disabled>Select Universities</option>
                <?php foreach ($universities as $university) { ?>
                    <option value="<?= $university['id'] ?>" 
                        <?= in_array($university['id'], $assigned_university_ids) ? 'selected' : '' ?>>
                        <?= $university['title'] ?>
                    </option>
                <?php } ?>
            </select>
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
        </div>
    </div>
</form>
<script>
    $(document).ready(function() {
        $('.select2').select2(
            {
                dropdownParent: $("#small_modal")
            }
        ); 
    });
</script>
