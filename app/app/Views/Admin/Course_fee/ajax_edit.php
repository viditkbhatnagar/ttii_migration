<form action="<?=base_url('admin/habit_category/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" value="<?=$edit_data['title']?>" >
        </div>
        <div class="col-12 form-group p-2">
            <label for="icon" class="form-label">Icon</label>
            <input type="file" class="form-control" id="icon" name="icon">
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
