<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/course/edit/'.$edit_data['id'])?>" enctype="multipart/form-data" method="post">
            <div class="row">
                
        
        <div class="col-lg-6 p-2">
            <label for="title" class="form-label">Course Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" placeholder="Name" required value="<?=$edit_data['title']?>">
        </div>

        <div class="col-lg-6 p-2">
            <label for="price" class="form-label">Upload Thumbnail</label>
            <input class="form-control" type="file" id="formFile" name="thumbnail"/>
        </div>

       
        <div class="col-lg-6 p-2 d-none">
            <div class="mt-3">
                <div>
                   
                    
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="show_exam" id="defaultIndeterminateCheck2" <?php if($edit_data["show_exam"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck2">Check if show exam</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="show_practice" id="defaultIndeterminateCheck3" <?php if($edit_data["show_practice"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck3">Check if show practice</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="show_material" id="defaultIndeterminateCheck4" <?php if($edit_data["show_material"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck4">Check if show material</label>
                    </div>
                </div>
            </div>
        </div>
   
        <div class="col-lg-12 p-2">
            <label for="title" class="form-label">Description</label>
            <textarea class="form-textarea" name="description" id="editor"><?=$edit_data['description']?></textarea>
        </div>
        
        <div class="col-lg-6 p-2">
            <label for="price" class="form-label">Course Price<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" id="price" name="price" placeholder="0.00" required value="<?=$edit_data['price']?>">
        </div>
        <div class="col-lg-6 p-2">
            <label for="discounted_price" class="form-label">Discount Price<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" id="discounted_price" name="discounted_price" placeholder="0.00" required value="<?=$edit_data['discounted_price']?>">
        </div>
        
        
         <div class="col-lg-6 p-2">
            <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="duration" name="duration"  required value="<?=$edit_data['duration']?>">
        </div>
       
        
        <div class="col-lg-6 p-2">
            <label for="instructor_id" class="form-label">instructor</label>
            <select class="form-control select2" data-toggle="select2" name="instructor_id" id="instructor_id" >
                <option value="">None</option>
                <?php foreach($instructor as $val){ ?>
                <option value="<?=$val['id']?>" <?php if($edit_data["instructor_id"]==$val['id'])echo "selected"; ?>><?=$val['name']?></option>
                <?php } ?>
            </select>
        </div>
       
         <div class="col-lg-12 p-2">
            <label for="title" class="form-label">Features</label>
            <textarea class="form-textarea" name="features" id="editor2"><?=$edit_data['features']?></textarea>
        </div>
        
          <div class="col-lg-6 p-2">
            <div class="mt-3">
                <div>
                    <br>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="is_featured" id="defaultIndeterminateCheck2" <?php if($edit_data["is_featured"]==1)echo "checked"; ?>> 
                        <label class="form-check-label" for="defaultIndeterminateCheck1">
                            Is Featured Course?
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
        
        <div class="col-lg-12 p-2">
            <div class="mt-3">
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="1" name="is_free_course" id="defaultIndeterminateCheck2"  <?php if($edit_data["is_free_course"]==1)echo "checked"; ?>>
                        <label class="form-check-label" for="defaultIndeterminateCheck2">
                            Is this Free?
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
        </form>
        <?php
    }
?>
<script>
$(document).ready(function() {
    $("#category_id").select2({
        dropdownParent: $("#large_modal")
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

    // Initialize the second editor with bullet list option only
    ClassicEditor
        .create(document.querySelector('#editor2'), {
            toolbar: ['bulletedList']
        })
        .then(editor => {
            console.log(editor);
        })
        .catch(error => {
            console.error(error);
        });
});
</script>