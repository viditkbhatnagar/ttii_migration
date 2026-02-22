<style>
    .image,
    .video_url {
        display: none;
    }
</style>
<form action="<?=base_url('admin/stories/add')?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Date</label>
            <input type="date" class="form-control" id="date" name="date" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Course<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="course_id" id="course_id">
               <option value="0">All course</option>
               <?php foreach($courses as $item){?>
                    <option value="<?=$item['id']?>"><?=$item['title']?></option>
                <?php }  ?>    
           </select>
        </div>
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Image</label>
            <input type="file" class="form-control" id="" name="image" >
        </div>
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
  